'use strict';

var redis = require('redis'),
  url = require('url');

module.exports = exports = function (core) {
  var config;
  if (core.config.redisUrl && core.config.redisUrl.port && core.config.redisUrl.host) {
    config = {
      'port': core.config.redisUrl.port || 6379,
      'host': core.config.redisUrl.host || 'localhost',
      'auth': core.config.redisUrl.auth
    };
  } else {
    var redisConfigUrlParsed = url.parse(core.config.redisUrl);
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
  }

  /**
   * @method Hunt#createRedisClient
   * @description
   * Creates redis client
   * @see Hunt#redisClient
   */
  core.createRedisClient = function () {
    var
      h = this,
      r = redis.createClient(config.port, config.host),
      original_send_command = r.send_command;

    r.send_command = function (command, args, callback) {
      var
        startedAt = new Date(),
        constructedArguments = [];
//      console.log('redis.send_command',command, args, args[args.length-1],callback);

      if (callback === undefined) {
        if (typeof args[args.length - 1] === 'function') {
          callback = args[args.length - 1];
          args.pop();
        } else {
          callback = function (error, result) {
            if (error) {
              throw error;
            }
          };
        }
      }
      /**
       * Emitted on every request send to any of data storage drivers - redis, mongoose, sequilize...
       * Namespace is `profiling:redis:*` with namespaces consisted of
       * redis command names and arguments' values
       *
       * @see Hunt#on
       * @see Hunt#onAny
       * @see Hunt#once
       * @event Hunt#profiling:*
       * @type {object}
       * @property {Date} startedAt
       * @property {Date} finishedAt
       * @property {Number} duration - duration of request in milliseconds
       * @property {String} driver - database driver used, `redis` in this case
       * @property {String} command
       * @property {String} command
       * @property {Error|null} error
       * @property {string} result
       * @tutorial profiling
       * @tutorial events
       * @example
       *
       * function listener(payload){
       *   console.log('We received event '+this.event+' with payload', payload);
       * }
       *
       * //All this listeners will be fired on
       * //redis command `set someKeyName someKeyValue`
       *
       * Hunt.on('profiling:*', listener);
       * Hunt.on('profiling:redis:*', listener);
       * Hunt.on('profiling:redis:set:*', listener);
       * Hunt.on('profiling:redis:set:someKeyName:*', listener);
       * Hunt.on('profiling:redis:set:someKeyName:someKeyValue', listener);
       * Hunt.redisClient.set('someKeyName','someKeyValue');
       */

      /**
       * Emitted on every redis command.
       * Namespace is `profiling:redis:*` with namespaces consisted of
       * redis command names and arguments' values
       *
       * @see Hunt#on
       * @see Hunt#onAny
       * @see Hunt#once
       * @event Hunt#profiling:redis:*
       * @type {object}
       * @property {Date} startedAt
       * @property {Date} finishedAt
       * @property {Number} duration - duration of request in milliseconds
       * @property {String} driver - database driver used, `redis` in this case
       * @property {String} command
       * @property {String} command
       * @property {Error|null} error
       * @property {string} result
       * @tutorial profiling
       * @tutorial events
       * @example
       *
       * function listener(payload){
       *   console.log('We recieved event '+this.event+' with payload', payload);
       * }
       *
       * //All this listeners will be fired on
       * //redis command `set someKeyName someKeyValue`
       *
       * Hunt.on('profiling:*', listener);
       * Hunt.on('profiling:redis:*', listener);
       * Hunt.on('profiling:redis:set:*', listener);
       * Hunt.on('profiling:redis:set:someKeyName:*', listener);
       * Hunt.on('profiling:redis:set:someKeyName:someKeyValue', listener);
       * Hunt.redisClient.set('someKeyName','someKeyValue');
       */
      function newCallback(error, result) {
        var tree = ['profiling', 'redis', command],
          finishedAt = new Date(),
          payload = {
            'startedAt': startedAt,
            'finishedAt': finishedAt,
            'duration': (finishedAt.getTime() - startedAt.getTime()),
            'driver': 'redis',
            'command': command,
            'query': (command + ' ' + args.join(' ')),
            'error': error,
            'result': result
          };

        args.map(function (a) {
          tree.push(a);
        });
        h.emit(tree, payload);
        return callback(error, result);
      }


      constructedArguments.push(command);
      constructedArguments.push(args);
      constructedArguments.push(newCallback);
      return original_send_command.apply(this, constructedArguments);
    };
    if (config.auth) {
      r.auth(config.auth);
    }
    return r;
  };

  /**
   * @name Hunt#redisClient
   * @description
   * Ready to use redis client with connection parameters
   * taken from config object.
   * {@link http://npmjs.org/package/redis | Additional info on redis client}
   */
  Object.defineProperty(core, "redisClient", {
    get: function () {
      return this.createRedisClient();
    }
  });

};
