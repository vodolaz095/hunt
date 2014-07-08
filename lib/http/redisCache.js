'use strict';
var curl = require('request'),
  crypto = require('crypto'),
  cacheKey = crypto.createHash('md5').update('' + (Math.random() * Date.now())).digest('hex').toString();


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

    return function (req, res, next) {
      if (req.method === 'GET' && req.headers['hunt_cache'] !== cacheKey) {
        var key = req.originalUrl;
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
              res.set('Expires', new Date(Date.now() + obj.age).toUTCString());
              res.set('Last-Modified', new Date(obj.dataFound.savedAt).toUTCString());
              res.set('Content-Type', obj.dataFound.contentType);
              res.status(obj.dataFound.statusCode);
              res.send(obj.dataFound.content);
            } else {
              curl({
                  'method': 'GET',
                  'headers': {
                    'hunt_cache': cacheKey
                  },
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
                        r.expire(key, Math.floor(ttl / 1000), function (error) {
                          if (error) {
                            throw error;
                          } else {
                            res.set('Expires', new Date(Date.now() + ttl).toUTCString());
                            res.set('Last-Modified', new Date().toUTCString());
                            res.set('Content-Type', response.headers['content-type']);
                            res.status(response.statusCode);
                            res.send(body);
                          }
                        });
                      }
                    });
                  }
                }
              );
            }
          }
        });
      } else {
        next();
      }
    };
  };
};