var crypto = require('crypto');
var events = require('events');
var inherits = require('util').inherits;

var _ = require('lodash');
var request = require('request');
var Q = require('q');

request = Q.nbind(request);

/**
 * @param {string} path
 * @return {Q.Promise<?>}
 */
function weatherRequest(path) {
    var requestOpts = {
        url: 'http://ekb.shri14.ru/api' + path,
        json: true
    };

    return request(requestOpts).spread(function (response, body) {
        return body;
    });
}

/**
 * @param {number} geoid
 * @return {Q.Promise<?>}
 */
function getLocalityInfo(geoid) {
    return weatherRequest('/localities/' + geoid);
}

/**
 * @param {number} geoid
 * @return {Q.Promise<?>}
 */
function getCitiesList(geoid) {
    return weatherRequest('/localities/' + geoid + '/cities');
}

/**
 * @param {number} geoid
 * @return {Q.Promise<?>}
 */
function getProvincesList(geoid) {
    return weatherRequest('/localities/' + geoid + '/provinces');
}

/**
 * @param {number[]} geoids
 * @return {Q.Promise<?>}
 */
function getFactual(geoids) {
    return weatherRequest('/factual?ids=' + geoids.join(','));
}


/**
 * @event WeatherKeeper#new
 * @type {Object} weather
 */

/**
 * @class WeatherKeeper
 * @param {number} geoid
 * @param {number} [syncInterval=30000]
 */
function WeatherKeeper(geoid, syncInterval) {
    syncInterval = _.isUndefined(syncInterval) ? 30000 : syncInterval;

    events.EventEmitter.call(this);

    this._geoid = geoid;
    this._syncInterval = syncInterval;

    this._state = {
        isActive: true,
        weatherHash: null
    };

    setTimeout(this._sync.bind(this), this._syncInterval);
}

inherits(WeatherKeeper, events.EventEmitter);

/**
 */
WeatherKeeper.prototype._sync = function () {
    var self = this;

    if (self._state.isActive === false) { return; }

    getLocalityInfo(self._geoid).then(function (data) {
        var rawData = JSON.stringify(data);
        var dataHash = crypto.createHash('sha1').update(rawData).digest().toString('hex');

        if (self._state.weatherHash !== dataHash) {
            self._state.weatherHash = dataHash;
            self.emit('new', data);
        }

    }).finally(function () {
        setTimeout(self._sync.bind(self), self._syncInterval);

    });
};

/**
 */
WeatherKeeper.prototype.stop = function () {
    this._state.isActive = false;
};


module.exports = {
    getLocalityInfo: getLocalityInfo,
    getCitiesList: getCitiesList,
    getProvincesList: getProvincesList,
    getFactual: getFactual,
    WeatherKeeper: WeatherKeeper
};
