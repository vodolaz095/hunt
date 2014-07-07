'use strict';
var request = require('request');

//redis cache middleware

/**
 * @method Hunt#cachingMiddleware
 * @param {(number|null)} [ttl=60] cache invalidation time, default is 60 seconds
 * @description
 * Generate caching middleware for this route
 * @example
 * ```
 *
 * Hunt.extendApp(core){
 *  core.app.use('/cacheForTenSeconds',Hunt.cachingMiddleware(10));
 *  core.app.use('/cacheForSixtySeconds',Hunt.cachingMiddleware());
 *  core.app.get('*', function(request, response){
 *    response.send('Current time is '+new Date());
 *  });
 * }
 *
 * ```
 */
module.exports = exports = function (core) {
  return function (ttl) {
    ttl = ttl || 60 * 1000;
    var r = core.redisClient;

    return function (request, response, next) {
      if (request.method == 'GET') {
        var key = request.originalUrl;
        core.async.parallel({
          'dataFound': function (cb) {
            r.hgetall(key, cb);
          },
          'age': function (cb) {
            r.ttl(key, cb);
          }
        }, function (error, obj) {
          if (error) {
            throw error;
          } else {
            if (obj.dataFound) {
              response.set('Expires', new Date(Date.now() + obj.age).toUTCString());
              response.set('Last-Modified', obj.dataFound.savedAt.toUTCString());
              response.set('Content-Type', obj.dataFound.contentType);
              response.status(obj.dataFound.statusCode);
              response.send(obj.dataFound.content);
            } else {
              request({
                'method': 'GET',
                'url': 'http://localhost:' + core.config.port + key
              }, function (error, response, body) {
                if (error) {
                  throw error;
                } else {
                  r.hmset(key, {
                    'savedAt': new Date(),
                    'contentType': response.headers['content-type'],
                    'statusCode': response.statusCode,
                    'content': body
                  }, function (error) {
                    if (error) {
                      throw error;
                    } else {
                      r.expire(key, ttl, function (error) {
                        if (error) {
                          throw error;
                        } else {
                          response.set('Expires', new Date(Date.now() + ttl).toUTCString());
                          response.set('Last-Modified', new Date().toUTCString());
                          response.set('Content-Type', response.headers['content-type']);
                          response.status(response.statusCode);
                          response.send(body);
                        }
                      });
                    }
                  });
                }
              });
            }
          }
        });
      } else {
        next();
      }
    };
  };
};