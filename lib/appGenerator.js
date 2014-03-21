'use strict';

var express = require('express'),
  flashMiddleware = require('connect-flash'),
  RedisStore = require('connect-redis')(express),
  domain = require('domain'),
  fs = require('fs'),
  huntVersion = require('./../package.json').version;

require('express-resource');
require('colors');

module.exports = exports = function (core, extendAppFunctions, extendMiddlewareFunctions, extendRoutesFunctions) {

// set shutdown procedure
  process.on('SIGINT', function () {
    core.stop();
    process.exit();
  });

/**
 * @name Hunt#express
 * @description
 * {@link http://expressjs.com/ | ExpressJS} framework constructor with static methods
 * exposed, for example core.express.static is middleware used for serving
 * css, client side javascripts, images.
 */
  core.express = express;
/**
 * @name Hunt#app
 * @description
 * {@link http://expressjs.com/ | ExpressJS} application instance
 */
  core.app = express();

/**
 * @name Hunt#httpServer
 * @description
 * {@link http://nodejs.org/api/http.html | http} server class, used by socket.io and expressJS objects
 * @see Hunt#express
 * @see Hunt#io
 */
  core.httpServer = core.http.createServer(core.app);
  core.app.locals.css = [];
  core.app.locals.javascripts = [];

//setting domains, so errors do not loose
  core.app.use(function(request, response, next){
    var reqd = domain.create();
    domain.active = reqd;
    reqd.add(request);
    reqd.add(response);
    reqd.on('error', function(err) {
      next(err);
    });
    response.on('end', function() {
      reqd.dispose();
    });
    reqd.run(next);
  });

  core.app.set('env', core.config.env);
  var sessionStorage = new RedisStore({prefix: 'hunt_session_', client: core.redisClient});

//do socket.io related things...
  if (core.config.io) {
    var ioServer = require('socket.io'),
      ioRedis = require('redis'),
      IoRedisStore = require('socket.io/lib/stores/redis'),
      passportSocketIo = require('passport.socketio');

    /**
     * @name Hunt#io
     * @description
     * Ready to use {@link http://socket.io } object with passport.js integration
     */
    core.io = ioServer.listen(core.httpServer);
    core.io.enable('browser client cache');
    core.io.enable('browser client gzip');
    core.io.enable('browser client etag');
    core.io.enable('browser client minification');
    core.io.set('browser client expires', (24 * 60 * 60));

//https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO
//http://stackoverflow.com/questions/15093018/sessions-with-express-js-passport-js


//setting transports for nginx or heroku
//for Pound reverse proxy websockets do not works,
//but xhr/jsonp are enabled after few seconds

    core.io.set('transports', ['websocket', 'xhr-polling', 'jsonp-polling']);
    core.io.set('polling duration', 3);

    core.io.set('log level', (core.config.io.loglevel) ? (core.config.io.loglevel) : 2);
    core.io.enable('try multiple transports');
    core.io.set('connect timeout', 2000);
    core.app.locals.javascripts.push({'url': '/socket.io/socket.io.js'});


    core.io.set('store', new IoRedisStore({
      redis: ioRedis,
      redisPub: core.createRedisClient(), //it works in pub mode, it cannot access database
      redisSub: core.createRedisClient(), //it works in sub mode, it cannot access database
      redisClient: core.redisClient
    }));

    core.io.set('authorization', passportSocketIo.authorize({
        key: 'hunt.sid',
        passport : core.passport,
        secret: core.config.secret,
        store: sessionStorage,
        expireAfterSeconds: parseInt(core.config.passport.sessionExpireAfterSeconds) || 180,
        cookieParser: express.cookieParser,
        fail: function (data, message, critical, done) { //there is no passportJS user present for this session!
//          console.log('fail');
//          console.log(data);
          data.user = null;
          done(null, true);
        },
        success: function (data, accept) { //the passportJS user is present for this session!
// console.log('vvv success');
// console.log(data);
// console.log('^^^ success');
          sessionStorage.get(data.sessionID, function (err, session) {
// console.log('v session');
// console.log(session);
// console.log('^ session');
            core.model.User.findOneByApiKey(session.passport.user, function (err, user) {
              if (user) {
// console.log('user found '+user.username);
                data.user = user;
                accept(err, true);
              } else {
//we break the session, because someone tryes to tamper it)
                accept(err, false);
              }
            });
          });
        }
      }
    ));

//emit event to all (authorized and anonimus) users online
/**
 * Broadcast message by socket.io to all site visitors, even the non authorized ones.
 *
 * @event Hunt#broadcast
 * @type {object}
 * @see Hunt#notify:sio
 */
    core.on('broadcast', function (message) {
      core.io.sockets.emit('broadcast', message);
    });

    core.io.sockets.on('connection', function (socket) {
      //console.log(socket);
      if (socket.handshake.user) {
        if (!socket.handshake.user.isOnline) {
          socket.handshake.user.lastSeenOnline = Date.now();
          socket.handshake.user.save(function (err) {
            if (err) throw err;
          });
        }
      }
    });

    core.on('notify:sio', function (message) {
//      console.log('notify:sio');
//      console.log(message);

      var activeUsers = core.io.sockets.manager.handshaken;
      for (var x in activeUsers) {
        if (activeUsers[x].user.apiKey === message.user.apiKey) {
//console.log('We can send notify to active user of '+message.user.username);
//console.log(core.io.sockets.manager.sockets.sockets[x]);
          if (core.io.sockets.manager.sockets.sockets[x]) {
            core.io.sockets.manager.sockets.sockets[x].emit('notify', message);
          }
        }
      }
    });
  }

//start configuring middlewares
  core.app.enable('trust proxy'); //because I DO insist of running Hunt behind pound/nginx as reverse proxy

//setting up the view engine
  switch (core.config.templateEngine) {
    case 'hogan':
      require('./templateEngines/hoganExpressEngine.js')(core);
      break;
    case 'swig':
      require('./templateEngines/swigEngine.js')(core);
      break;
    case 'jade':
      require('./templateEngines/jadeEngine.js')(core);
      break;
    case 'ejs':
      require('./templateEngines/ejsEngine.js')(core); //todo implement
      break;
    default:
      require('./templateEngines/hoganExpressEngine.js')(core);
  }

//setting default and always working settings for app
  core.app.use(express.compress());
  core.app.use(express.favicon(core.config.favicon));

  core.app.use(express.json());
  core.app.use(express.urlencoded());
  if (core.config.uploadFiles) {
    core.app.use(express.multipart());
  }
  core.app.use(express.methodOverride());
  core.app.use(express.cookieParser(core.config.secret));
  core.app.use(express.session({
    key: 'hunt.sid',
    secret: core.config.secret,
    store: sessionStorage,
    expireAfterSeconds: parseInt(core.config.passport.sessionExpireAfterSeconds) || 180,
    httpOnly: true
  }));

//middleware for FLASH messages
  core.app.use(flashMiddleware());

//initializing passportjs middleware
  core.app.use(core.passport.initialize());
  core.app.use(core.passport.session());

//injecting default internals via middleware
  core.app.use(function (request, response, next) {
    if(request.session){
      response.locals.flash = request.flash();
    }
    response.setHeader('X-Powered-By', 'Hunt v' + huntVersion);
    core.app.locals.hostUrl = core.config.hostUrl;
    request.model = core.model;
    request.redisClient = core.redisClient;
    request.huntEmit = function (eventName, eventPayload) {
      core.emit(eventName, eventPayload);
    };
    next();
  });

//api authorization
  core.app.use(function (request, response, next) {
    if (request.user) {
      next();
    } else {
      if (core.config.huntKey) {
        var huntKey = false;
//huntKey as GET custom field
        if (request.query && request.query.huntKey) {//GET
          huntKey = request.query.huntKey;
        }
//huntKey as POST,PUT,DELETE custom field
        if (request.body && request.body.huntKey) {//POST,PUT,DELETE
          huntKey = request.body.huntKey;
        }
//huntKey as custom header
        if (request.headers.huntkey) { //toLowerString in headers
          huntKey = request.headers.huntkey;
        }

        if (huntKey) {
          request.model.Users.findOneByApiKey(huntKey, function (err, userFound) {
            if (err) {
              throw err;
            }
            if (userFound) {
              request.user = userFound;
            }
            next();
          });
        } else {
          next();
        }
      } else {
        next();
      }
    }
  });

//csrf protection
  if (!core.config.disableCsrf) {
    core.app.use(express.csrf());
    core.app.use(function (request, response, next) {
      if (request.session) {
        var token = request.csrfToken();
        response.locals.csrf = token;
        response.cookie('XSRF-TOKEN', token, {httpOnly: true});
        next();
      } else {
        next();
      }
    });
  }

//logging
  core.app.configure('development', function () {
    console.log('Development environment!'.green);
    core.app.use(express.responseTime());
    core.app.use(express.logger('dev'));
    core.app.locals.development = true;
  });

  core.app.configure('staging', function () {
    console.log('Staging environment!'.yellow);
    core.app.locals.staging = true;
    core.app.use(express.responseTime());
    core.app.enable('view cache');
    core.app.use(express.logger('dev'));
  });

  core.app.configure('production', function () {
    console.log('Production environment!'.red);
    core.app.locals.production = true;
    core.app.enable('view cache');
    core.app.use(express.logger('short'));
  });

//emit events for http requests
  core.app.use(function (request, response, next) {
    function emitHttpEvent() {
/**
 * Event emmited every time HTTP request is processed, usefull
 * for logging.
 *
 * @event Hunt#httpSuccess
 * @type {Object}
 * @property {Date} startTime
 * @property {number} duration
 * @property {number} statusCode
 * @property {string} method
 * @property {string} ip
 * @property {string} uri
 * @property {string} body
 * @property {string} query
 * @property {User} user - user who did the request
 */

      core.emit('httpSuccess', {
        'startTime': request._startTime,
        'duration': (Date.now() - request._startTime),
        'statusCode': response.statusCode,
        'method': request.method,
        'ip': request.ip,
        'uri': request.originalUrl,
        'query': request.query,
        'body': request.body,
        'user': request.user || null
      });
    }

    response.once('close', emitHttpEvent);
    response.once('finish', emitHttpEvent);
    next();
  });


//store last time seen online
//and injecting user profile in locals
//also we set the cache control as private
  core.app.use(function (request, response, next) {
    if (request.user) {
      response.locals.myself = request.user;
      response.set('cache-control','private');
      if (request.user.isOnline) {
        next();
      } else {
        request.user.lastSeenOnline = new Date();
        request.user.save(next);
      }
    } else {
      next();
    }
  });

//doing extendApp
  extendAppFunctions.map(function (func) {
    if (func.environment) {
      core.app.configure(func.environment, function () {
        func.settingsFunction(core);
      });
    } else {
      if (func && func.settingsFunction) {
        func.settingsFunction(core);
      }
    }
  });


//doing extendextendMiddleware
  extendMiddlewareFunctions.map(function (middleware) {
    var settingFunction = middleware.SettingsFunction(core);
    if (!settingFunction) {
      return;
    }
    if (middleware.environment) {
      core.app.configure(middleware.environment, function () {
        core.app.use(middleware.path, settingFunction);
      });
    } else {
      core.app.use(middleware.path, settingFunction);
    }
  });

//serving static public files (css, javascript...)
  if (core.config.public) {
    if (fs.statSync(core.config.public).isDirectory()) {
      core.app.use(express.static(core.config.public));
    } else {
      throw new Error('Unable to use directory ' + core.config.public + ' as Resourse Root for web server. Directory do not exists?');
    }
  }

//router middleware
  core.app.use(core.app.router);

// setting error handler middleware, after ROUTER middleware,
// so we can simply throw errors in routes and they will be catch here!
// firstly we emit an event of error.
  core.app.use(function(error, request, response, next){
/**
 * Event is emmited when error occurs while performing http response
 *
 * @event Hunt#httpError
 * @type {Object}
 * @property {Error} error
 * @property {object} errorStack
 * @property {Date} startTime
 * @property {number} duration
 * @property {number} statusCode
 * @property {string} method
 * @property {string} ip
 * @property {string} uri
 * @property {User} user - user who did the request
 * @example
 * ```javascript
 *   Hunt.extendCore(function(core){
 *    core.app.get('/error', function(request,response){
 *      throw new Error('Shit happens!');
 *    });
 *   });
 *
 *   Hunt.on('httpError', function(httpError){
 *     console.log(httpError.error.toString());
 *   });
 *   //=> Shit happens!
 * ```
 */
    core.emit('httpError', {
      'error': error,
      'errorStack': error.stack,
      'startTime': request._startTime,
      'duration': (Date.now() - request._startTime),
      'statusCode': response.statusCode,
      'method': request.method,
      'query': request.query,
      'body': request.body,
      'ip': request.ip,
      'uri': request.originalUrl,
      'user': request.user || null
    });
    next(error);
  });

  core.app.configure('development', function () {
    core.app.use(express.errorHandler());
  });

  core.app.use(function (err, request, response, next) {
    response.status(500);
    response.header('Retry-After', 360);
    response.send('Error 500. There are problems on our server. We will fix them soon!');//todo - change to our page...
  });

//middleware setup finished. adding routes

//adding dialog and chat group endpoints
  if (core.config.dialog) {
    extendRoutesFunctions.push(require('./dialog.api.js'));
  }

//doing setAppRoutes
  extendRoutesFunctions.map(function (func) {
    func(core);
  });
  return core;
};


/**
 * @class request
 * @classdesc
 * {@link http://nodejs.org/api/http.html#http_class_http_server | Nodejs }
 * request object,
 * extended not only by {@link http://expressjs.com/api.html#req.params | ExpressJS },
 * but also by Hunt. It have some additional objects in it
 *
 * @property {(User|null)} user currently authenticated user by means of {@link http://passportjs.org}
 * @property {model} model - shortcut to all Hunt models
 * @property {object} redisClient - ready to use redis client
 * @property {function} huntEmit - use Hunt event emmiter
 * @see Hunt#redisClient
 * @see Hunt#emit
 */

/**
 * @class response
 * @classdesc
 * {@link http://nodejs.org/api/http.html#http_class_http_serverresponse | Nodejs } response object, extended by {@link http://expressjs.com/api.html#res.status | ExpressJS }
 * Hunt adds some {@link http://expressjs.com/api.html#res.locals | locals} to each response
 * @property {(User|null)} locals.myself - user currently authenticated
 * @property {boolean} locals.development - set to true on development enviroment, passed to template engine
 * @property {boolean} locals.staging  - set to true on staging enviroment, passed to template engine
 * @property {boolean} locals.production  - set to true on production enviroment, passed to template engine
 * @property {string} locals.csrf - {@link https://en.wikipedia.org/wiki/Cross-site_request_forgery | cross site request forgery } protection token for {@link http://expressjs.com/api.html#csrf | CSRF middleware}
 * @property {Array} locals.css - array of css stylesheets to export to templates
 * @property {Array} locals.js - array of client side javascripts to export to templates
 * @property {Object} locals.flash - flash messages used by {@link https://github.com/jaredhanson/connect-flash | connect-flash middleware}
 */