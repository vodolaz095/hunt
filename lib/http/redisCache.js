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
 * Hunt.extendRoutes(core){
 *  core.app.use('/cacheForTenSeconds', Hunt.cachingMiddleware(10000));
 *  core.app.use('/cacheForSixtySeconds', Hunt.cachingMiddleware(60000));
 *  core.app.get('*', function(request, response){
 *    response.send('Current time is '+new Date());
 *  });
 * }
 *
 */
module.exports = exports = function (core) {
  return function (ttlInMilliSeconds) {
    ttlInMilliSeconds = ttlInMilliSeconds || 60 * 1000;
    var redisClient = core.redisClient;

    return function (req, res, next) {
      if (req.method === 'GET' && req.headers.hunt_cache !== cacheKey) {
        var key = req.originalUrl,
          data = {};
        core.async.waterfall([
          function (cb) {
            core.async.parallel({
              'dataFound': function (clb) {
                redisClient.hgetall(key, clb);
              },
              'age': function (clb) {
                redisClient.ttl(key, clb);
              }
            }, function (error, obj) {
              if (error) {
                cb(error);
              } else {
                cb(null, obj.dataFound, obj.age);
              }
            });
          },
          function (dataFound, age, cb) {
            if (dataFound) {
              data.Expires = new Date(Date.now() + age).toUTCString();
              data['Last-Modified'] = new Date(dataFound.savedAt).toUTCString();
              data['Content-Type'] = dataFound.contentType;
              data.statusCode = dataFound.statusCode;
              data.content = dataFound.content;
              cb(null, true);
            } else {
              var headers = req.headers;
              headers.hunt_cache = cacheKey;
              curl({
                'method': 'GET',
                'headers': headers,
                'url': 'http://localhost:' + core.config.port + key
              }, function (error, response, body) {
                if (error) {
                  cb(error);
                } else {
                  data.Expires = new Date(Date.now() + ttlInMilliSeconds).toUTCString();
                  data['Last-Modified'] = new Date().toUTCString();
                  data['Content-Type'] = response.headers['content-type'];
                  data.statusCode = response.statusCode;
                  data.content = body;
                  cb(error, false);
                }
              });
            }
          },
          function (hit, cb) {
            if (hit) {
              cb(null);
            } else {
              core.async.series([
                function (clb) {
                  redisClient.hmset(key, {
                    'savedAt': new Date(),
                    'contentType': data['Content-Type'],
                    'statusCode': data.statusCode,
                    'content': data.content
                  }, clb);
                },
                function (clb) {
                  redisClient.expire(key, Math.floor(ttlInMilliSeconds / 1000), clb);
                }
              ], cb);
            }
          }
        ], function (error) {
          if (error) {
            next(error);
          } else {
            res.set('Expires', data.Expires);
            res.set('Last-Modified', data['Last-Modified']);
            res.set('Content-Type', data['Content-Type']);
            res.status(data.statusCode);
            res.send(data.content);
          }
        });
      } else {
        next();
      }
    };
    //
    //return function (req, res, next) {
    //  if (req.method === 'GET' && req.headers['hunt_cache'] !== cacheKey) {
    //    var key = req.originalUrl;
    //    core.async.parallel({
    //      'dataFound': function (cb) {
    //        r.hgetall(key, cb);
    //      },
    //      'age': function (cb) {
    //        r.ttl(key, cb);
    //      }
    //    }, function (error, obj) {
    //      if (error) {
    //        throw error;
    //      } else {
    //        if (obj.dataFound) {
    //          res.set('Expires', new Date(Date.now() + obj.age).toUTCString());
    //          res.set('Last-Modified', new Date(obj.dataFound.savedAt).toUTCString());
    //          res.set('Content-Type', obj.dataFound.contentType);
    //          res.status(obj.dataFound.statusCode);
    //          res.send(obj.dataFound.content);
    //        } else { //todo - by async.waterfall
    //          curl({
    //              'method': 'GET',
    //              'headers': {
    //                'hunt_cache': cacheKey
    //              },
    //              'url': 'http://localhost:' + core.config.port + key
    //            }, function (error, response, body) {
    //              if (error) {
    //                throw error;
    //              } else {
    //                r.hmset(key, {
    //                  'savedAt': new Date(),
    //                  'contentType': response.headers['content-type'],
    //                  'statusCode': response.statusCode,
    //                  'content': body
    //                }, function (error) {
    //                  if (error) {
    //                    throw error;
    //                  } else {
    //                    r.expire(key, Math.floor(ttl / 1000), function (error) {
    //                      if (error) {
    //                        throw error;
    //                      } else {
    //                        res.set('Expires', new Date(Date.now() + ttl).toUTCString());
    //                        res.set('Last-Modified', new Date().toUTCString());
    //                        res.set('Content-Type', response.headers['content-type']);
    //                        res.status(response.statusCode);
    //                        res.send(body);
    //                      }
    //                    });
    //                  }
    //                });
    //              }
    //            }
    //          );
    //        }
    //      }
    //    });
    //  } else {
    //    next();
    //  }
    //};
  };
};