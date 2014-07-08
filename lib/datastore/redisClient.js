'use strict';

var redis = require('redis'),
  url = require('url');

module.exports = exports = function (core) {

  var redisConfigUrlParsed = url.parse(core.config.redisUrl),
    config;
  if (redisConfigUrlParsed) {
    config = {
      port: redisConfigUrlParsed.port,
      host: redisConfigUrlParsed.hostname
    };
    if (redisConfigUrlParsed.auth && redisConfigUrlParsed.auth.split(':')[1]) {
      config.auth = redisConfigUrlParsed.auth.split(':')[1];
    }
  } else {
    config = {
      'port': 6379,
      'host': 'localhost',
      'auth': null
    };
  }

  /**
   * @name Hunt#redisClient
   * @description
   * Ready to use redis client with connection parameters
   * taken from config object.
   * {@link http://npmjs.org/package/redis | Additional info on redis client}
   */
  core.redisClient = redis.createClient(config.port, config.host);
  core.redisClient.auth(config.auth);

  /**
   * @method Hunt#createRedisCliet
   * @description
   * Creates redis client
   * @see Hunt#redisClient
   */
  core.createRedisClient = function () {
    var r = redis.createClient(config.port, config.host);
    r.auth(config.auth);
    return r;
  };
};
