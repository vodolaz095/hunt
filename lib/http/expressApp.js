'use strict';

var
  jade = require('jade'),
  hoganExpress = require('hogan-express'),
  exphbs = require('express-handlebars'),
  express = require('express'),
  swig = require('swig'),
  bodyParser = require('body-parser'),
  multiPart = require('connect-multiparty')({
    'autoFields': false,
    'autoFiles': false
  }),
  flashMiddleware = require('connect-flash'),
  expressSession = require('express-session'),
  RedisStore = require('connect-redis')(expressSession),
  domain = require('domain'),
  fs = require('fs'),
  reportHttpError = require('./../errorReporter.js').reportHttpError,
  socketIoListener = require('./socket.io.js'),
  authRouter,
  authController = require('./auth.controller.js'),
  dialogRouter,
  usersRouter,
  usersController = require('./users.controller.js');


require('colors');

module.exports = exports = function (extendAppFunctions, extendControllerFunctions) {
  var core = this;
// set shutdown procedure
  process.on('SIGINT', function () {
    core.stop();
    process.exit();
  });

  core.extendCore('preload', require('./../exportModel/toRest/preload.js'));
  core.extendCore('errorResponses', require('./errors.js'));
  core.extendCore('cachingMiddleware', require('./redisCache.js'));
  /**
   * @method Hunt#multipart
   * @returns function(request,response,next){}
   * @description
   * Return {@link https://www.npmjs.com/package/connect-multiparty connect-multiparty } middleware
   * to parse uploaded data and populate {@link request}.files with data.
   * For example, when we submit form like this
   *
   * ```html
   *   <form action="/upload" method="post" enctype="multipart/form-data">
   *     Select image to upload:
   *     <input type="file" name="file" id="fileToUpload">
   *     <input type="submit" value="Upload Image" name="submit">
   *    </form>
   * ```
   *  the `request.files` is dictionary like this:
   *
   *  ```javascript
   *  {
   *    file: {
   *         fieldName: 'file',
   *        originalFilename: 'Kate Moss.jpg',
   *        path: '/tmp/4235-1yw9ixo.jpg',
   *        size: 61030,
   *        name: 'Kate Moss.jpg',
   *        type: 'image/jpeg',
   *        headers: {
   *         'content-disposition': 'form-data; name="file"; filename="Kate Moss.jpg"',
   *         'content-type': 'image/jpeg'
   *      },
   *      ws: {
   *       _writableState: [Object],
   *       writable: true,
   *       domain: [Object],
   *       _events: [Object],
   *       _maxListeners: 10,
   *       path: '/tmp/4235-1yw9ixo.jpg',
   *       fd: null,
   *       flags: 'w',
   *       mode: 438,
   *       start: undefined,
   *       pos: undefined,
   *       bytesWritten: 61030,
   *       closed: true
   *       }
   *    }
   *  }
   *```
   *
   * It is worth noting, that files are cleared after response is send to user!
   */
  core.extendCore('multipart', function (core) {
    return function (request, response, next) {
      var doThings = function () {
        var filesToDelete = [];
        if (typeof request.files === 'object') {
          Object.keys(request.files).forEach(function (t) {
            filesToDelete.push(t.path);
          });
          core.async.each(filesToDelete, function (filePath, cb) {
            if (filePath) {
              fs.exists(filePath, function (doExist) {
                if (doExist) {
                  fs.unlink(filePath, cb);
                } else {
                  cb();
                }
              });
            } else {
              cb();
            }
          });
        }
      };
      response.once('close', doThings);
      response.once('finish', doThings);
      return multiPart(request, response, next);
    };
  });

  /**
   * @method Hunt#forceHttps
   * @returns function(request,response,next){}
   * @description
   * Middleware to ensure that connection is done via HTTPS protocol only.
   * If request is done via HTTP protocol, user is redirected to HTTPS on the same url.
   * This middleware do nothing if application environment is not `production`
   * @see config#env
   */
  core.extendCore('forceHttps', function (core) {
    return function (request, response, next) {
      if (core.config.env === 'production' && request.protocol === 'http') {
        response.redirect(core.config.hostUrl.slice(0, core.config.hostUrl.length - 1) + request.originalUrl);
      } else {
        next();
      }
    };
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
  core.app.disable('x-powered-by'); //sorry, TJ ;-)
  /**
   * @name Hunt#httpServer
   * @description
   * {@link http://nodejs.org/api/http.html | http} server class, used by socket.io and expressJS objects
   * @see Hunt#express
   * @see Hunt#io
   */
  core.httpServer = core.http.createServer(core.app);

//setting domains, so errors do not loose
  core.app.use(function (request, response, next) {
    var reqd = domain.create();
    domain.active = reqd;
    reqd.add(request);
    reqd.add(response);
    reqd.on('error', function (err) {
      next(err);
    });
    response.on('end', function () {
      reqd.dispose();
    });
    reqd.run(next);
  });
//injecting permanent locals (that are the same for all responses
  core.app.locals.css = [];
  core.app.locals.javascripts = [];
  core.app.locals.hostUrl = core.config.hostUrl;

  core.app.set('env', core.config.env);
  /**
   * @name Hunt#sessionStorage
   * @description
   * Connect-compatible {@link https://www.npmjs.org/package/connect-redis | redis sessions` storage } used by
   * {@link Hunt#express Express application } and {@link Hunt#io  Socket.io server }
   */
  core.sessionStorage = new RedisStore({prefix: 'hunt_session_', client: core.redisClient});

  core.app.enable('trust proxy');
//because I DO insist of running Hunt behind pound/nginx as reverse proxy

//setting up the view engines
  core.app.set('views', core.config.views || './views');
  core.app.set('view engine', 'html');
  core.app.engine('hbs', exphbs({defaultLayout: 'layout', extname: '.hbs'}));
  core.app.engine('html', hoganExpress);
  core.app.engine('swig', swig.renderFile);
  core.app.engine('jade', jade.__express);
  core.app.set('layout', 'layout');
  core.app.locals.delimiters = '[[ ]]';

//setting default and always working settings for app
  core.app.use(require('compression')());
  core.app.use(require('serve-favicon')(core.config.favicon));
  core.app.use(require('method-override')());

// parse application/x-www-form-urlencoded
  core.app.use(bodyParser.urlencoded({extended: false}));

// parse application/json
  core.app.use(bodyParser.json());

  if (core.config.uploadFiles) {
    core.app.use(multiPart());
  }
  core.app.use(require('cookie-parser')(core.config.secret));
  core.app.use(expressSession({
    key: 'hunt.sid',
    secret: core.config.secret,
    store: core.sessionStorage,
    expireAfterSeconds: parseInt(core.config.passport.sessionExpireAfterSeconds, 10) || 180,
    httpOnly: true,
    resave: true,
    saveUninitialized: true
  }));

//middleware for FLASH messages
  /**
   * @method request#flash
   * @description
   * {@link https://www.npmjs.com/package/connect-flash | connect-flash} exposes a flash() function on request.
   * The flash is a special area of the session used for storing messages. Messages are written to the flash and cleared after being displayed to the user. The flash is typically used in combination with redirects, ensuring that the message is available to the next page that is to be rendered.
   * @example
   *
   * hunt.extendController(function(core, router){
   *   router.get('/flash', function(req, res){
   *     // Set a flash message by passing the key, followed by the value, to req.flash().
   *     req.flash('info', 'Flash is back!')
   *     res.redirect('/');
   *   });
   *
   *   router.get('/', function(req, res){
   *     // Get an array of flash messages by passing the key to req.flash()
   *     res.render('index', { messages: req.flash('info') });
   *   });
   * });
   *
   */
  core.app.use(flashMiddleware());

//initializing passportjs middleware
  /**
   * @method request#login
   * @tutorial authorization
   * @description
   * {@link http://passportjs.org/docs/login | Passport.js} exposes a login() function on request (also aliased as logIn()) that can be used to establish a login session.
   * @example
   *
   * req.login(user, function(err) {
   *   if (err) {
   *     throw err;
   *   }
   *   res.redirect('/users/' + req.user.username);
   * });
   */

  /**
   * @method request#logIn
   * @tutorial authorization
   * @description
   * {@link http://passportjs.org/docs/login | Passport.js} exposes a login() function on request (also aliased as logIn()) that can be used to establish a login session.
   * @example
   *
   * req.login(user, function(err) {
   *   if (err) {
   *     throw err;
   *   }
   *   res.redirect('/users/' + req.user.username);
   * });
   */


  /**
   * @method request#logout
   * @tutorial authorization
   * @description
   * {@link http://passportjs.org/docs/logout | Passport.js} exposes a logout() function on request (also aliased as logOut()) that can be called from any route handler which needs to terminate a login session. Invoking logout() will remove the req.user property and clear the login session (if any).
   * @example
   * hunt.extendController(function(core, router){
   *   router.get('/logout', function(req, res){
   *     req.logout();
   *     res.redirect('/');
   *   });
   * });
   */

  /**
   * @method request#logOut
   * @tutorial authorization
   * @description
   * {@link http://passportjs.org/docs/logout | Passport.js} exposes a logout() function on request (also aliased as logOut()) that can be called from any route handler which needs to terminate a login session. Invoking logout() will remove the req.user property and clear the login session (if any).
   * @example
   * hunt.extendController(function(core, router){
   *   router.get('/logout', function(req, res){
   *     req.logout();
   *     res.redirect('/');
   *   });
   * });
   */
  core.app.use(core.passport.initialize());
  core.app.use(core.passport.session());

//do socket.io related things...
  if (core.config.io && core.config.io.enabled) {
    delete core.io;
    core.extendCore('io', socketIoListener);
  }

//injecting default internals via middleware
  core.app.use(function (request, response, next) {
//injecting models and other usefull into request
    request.model = core.model;
    request.redisClient = core.redisClient;
    request.huntEmit = function (eventName, eventPayload) {
      return core.huntEmit(eventName, eventPayload);
    };
    request.io = core.io;
//injecting flash messages
    if (request.session) {
      response.locals.flash = request.flash();
    }
//injecting environment headers
    if (core.config.env === 'development') {
      response.setHeader('X-Environment', 'Development');
    }
    if (core.config.env === 'staging') {
      response.setHeader('X-Environment', 'Staging');
    }
    response.setHeader('X-Powered-By', 'Hunt v' + core.version);
    next();
  });

//remember me via cookie
  core.app.use(function (request, response, next) {
    if (request.user) {
      next();
    } else {
//http://expressjs.com/api.html#req.signedCookies
//http://expressjs.com/api.html#res.clearCookie
      var huntKey = request.signedCookies.remember;
      if (huntKey) {
        response.clearCookie('remember', {'path': '/'});
        request.model.User.findOneByHuntKey(huntKey, function (err, userFound) {
          if (err) {
            throw err;
          }
          if (userFound) {
            request.logIn(userFound, next);
          } else {
            next();
          }
        });
      } else {
        next();
      }
    }
  });

//api authorization by GET query or POST/PUT/DELETE body parameter
  core.app.use(function (request, response, next) {
    if (request.user) {
      next();
    } else {
      if (core.config.huntKey) {
        var huntKey = false;
//huntKey as GET custom field
        if (request.query && request.query.huntKey) {//GET
          huntKey = request.query.huntKey;
          delete request.query.huntKey;
        }
//huntKey as POST,PUT,DELETE custom body parameter
        if (request.body && request.body.huntKey) {//POST,PUT,DELETE
          huntKey = request.body.huntKey;
          delete request.body.huntKey;
        }
        if (huntKey) {
          request.model.User.findOneByHuntKey(huntKey, function (err, userFound) {
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

//api authorization by custom header
  core.app.use(function (request, response, next) {
    if (request.user) {
      next();
    } else {
      if (core.config.huntKeyHeader) {
        var huntKey = false;
//huntKey as custom header
        if (request.headers.huntkey) { //toLowerString in headers
          huntKey = request.headers.huntkey;
          delete request.headers.huntkey;
        }

        if (huntKey) {
          request.model.User.findOneByHuntKey(huntKey, function (err, userFound) {
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
    core.app.use(require('csurf')());
    core.app.use(function (request, response, next) {
      if (request.session) {
        var token = request.csrfToken();
        response.locals.csrf = token;
        response.cookie('XSRF-TOKEN', token);
        next();
      } else {
        next();
      }
    });
  }

//different setup for different environments
  switch (core.config.env) {
  case 'production':
    console.log('Production environment!'.red);
    core.app.locals.environment = 'production';
    core.app.locals.production = true;
    core.app.enable('view cache');
    core.app.use(require('morgan')('short'));
    break;
  case 'staging':
    console.log('Staging environment!'.yellow);
    core.app.locals.environment = 'staging';
    core.app.locals.staging = true;
    core.app.use(require('response-time')());
    core.app.enable('view cache');
    core.app.use(require('morgan')('dev'));
    break;
  default:
    console.log('Development environment!'.green);
    core.app.use(require('response-time')());
    core.app.use(require('morgan')('dev'));
    core.app.locals.environment = 'development';
    core.app.locals.development = true;
    core.app.set('json spaces', 2);
  }

//emit events for http requests
  core.app.use(function (request, response, next) {
    var socket = request.socket;

    function emitHttpEvent() {
      /**
       * Event emitted every time HTTP request is processed successfully, useful
       * for logging. It belongs to `http` namespace
       *
       * @event Hunt#http:success
       * @type {Object}
       * @property {Date} startTime - start time of request
       * @property {number} duration - duration of request processing in milliseconds
       * @property {number} statusCode
       * @property {string} method - request method - GET, POST, PUT, DELETE
       * @property {string} ip - ip address of remote host
       * @property {string} ips - proxy chain if present - {@link http://expressjs.com/api.html#req.ips}
       * @property {string} uri
       * @property {string} body - This property is an object containing the parsed request body. This feature is provided by the bodyParser() middleware, though other body parsing middleware may follow this convention as well. This property defaults to {} when bodyParser() is used. {@link http://expressjs.com/3x/api.html#req.body}
       * @property {string} query - object containing the parsed query-string, defaulting to empty object - {@link http://expressjs.com/3x/api.html#req.query}
       * @property {User} user - user who did the request
       *
       * @example
       *
       *   Hunt.on('http:*', function(httpEvent){
       *     console.log('Http response processed!');
       *   });
       *
       *   Hunt.on('http:success', function(httpEvent){
       *     console.log('Http response processed ok for ', httpEvent.ip);
       *   });
       *
       *   Hunt.on('http:error', function(httpEvent){
       *     console.log('Http response failed for ', httpEvent.ip);
       *   });
       *
       */

      core.emit('http:success', {
        'startTime': request._startTime,
        'duration': (Date.now() - request._startTime),
        'statusCode': response.statusCode,
        'method': request.method,
        'ip': request.ip,
        'ips': request.ips,
        'uri': request.originalUrl,
        'query': request.query,
        'body': request.body,
        'files': request.files,
        'user': request.user || null
      });

      /**
       * Event emitted every time HTTP request is processed (successfully or not)
       * for logging. `http:*` is namespace for `http`:`success` and `http`:`error`
       * events
       *
       * @event Hunt#http:*
       * @see Hunt#http:success
       * @see Hunt#http:error
       * @type {Object}
       * @property {Date} startTime - start time of request
       * @property {number} duration - duration of request processing in milliseconds
       * @property {number} statusCode
       * @property {string} method - request method - GET, POST, PUT, DELETE
       * @property {string} ip - ip address of remote host
       * @property {string} ips - proxy chain if present - {@link http://expressjs.com/api.html#req.ips}
       * @property {string} uri
       * @property {string} body - This property is an object containing the parsed request body. This feature is provided by the bodyParser() middleware, though other body parsing middleware may follow this convention as well. This property defaults to {} when bodyParser() is used. {@link http://expressjs.com/3x/api.html#req.body}
       * @property {string} query - object containing the parsed query-string, defaulting to empty object - {@link http://expressjs.com/3x/api.html#req.query}
       * @property {User} user - user who did the request
       *
       * @example
       *
       *   Hunt.on('http:*', function(httpEvent){
       *     console.log('Http response processed!');
       *   });
       *
       *   Hunt.on('http:success', function(httpEvent){
       *     console.log('Http response processed ok for ', httpEvent.ip);
       *   });
       *
       *   Hunt.on('http:error', function(httpEvent){
       *     console.log('Http response failed for ', httpEvent.ip);
       *   });
       */
    }

    response.once('close', emitHttpEvent);
    response.once('finish', emitHttpEvent);
// clear some memleaks
    response.on('finish', function () {
      socket.removeAllListeners('timeout');
      socket.setTimeout(5000, function () {
        socket.destroy();
      });
    });
    next();
  });


//store last time seen online
//and injecting user profile in locals
//also we set the cache control as private
  core.app.use(function (request, response, next) {
    if (request.user) {
      response.locals.myself = request.user;
      response.set('cache-control', 'private');
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

//serving static public files (css, javascript...)
  if (core.config.public) {
    /*jslint stupid: true */
    if (fs.statSync(core.config.public).isDirectory()) {
      core.app.use(express.static(core.config.public));
    } else {
      throw new Error('Unable to use directory ' + core.config.public + ' as Resource Root for web server. Does directory exists?');
    }
    /*jslint stupid: false */
  }

//adding dialog endpoints
  if (core.config.dialog) {
    dialogRouter = express.Router();
    core.exportModelToRest({
      'mountPoint': '/api/v1/message',
      'modelName': 'Message',
      'ownerId': 'from'
    });
    core.exportModelToRest({
      'mountPoint': '/api/v1/messages',
      'modelName': 'Message',
      'ownerId': 'from'
    });
  }

//adding authorization router
  if (core.config.passport) {
    authRouter = express.Router();
    authController(core, authRouter);
    core.app.use('/auth', authRouter);
  }

//adding users' api
  if (core.config.usersApi) {
    usersRouter = express.Router();
    usersController(core, usersRouter);
    core.exportModelToRest({
      'mountPount': '/api/v1/user',
      'modelName': 'User',
      'ownerId': '_id'
    });
    core.exportModelToRest({
      'mountPount': '/api/v1/users',
      'modelName': 'User',
      'ownerId': '_id'
    });
    core.app.use('/api/v1/user', usersRouter);
    core.app.use('/api/v1/users', usersRouter);
  }

//extendControllerFunctions
  extendControllerFunctions.map(function (r) {
    var router = express.Router();
    r.settingsFunction(core, router);
    core.app.use(r.mountPoint, router);
  });


// setting error handler middleware, after ROUTER middleware,
// so we can simply throw errors in routes and they will be catch here!
// firstly we emit an event of error.
  core.app.use(function (error, request, response, next) {
    /**
     * Event is emmited when error occurs while performing http response
     *
     * @event Hunt#http:error
     * @type {Object}
     * @property {Error} error
     * @property {object} errorStack
     * @property {Date} startTime - start time of request
     * @property {number} duration - duration of request processing in milliseconds
     * @property {number} statusCode
     * @property {string} method - request method - GET, POST, PUT, DELETE
     * @property {string} ip - ip address of remote host
     * @property {string} ips - proxy chain if present - {@link http://expressjs.com/api.html#req.ips}
     * @property {string} uri
     * @property {string} body - This property is an object containing the parsed request body. This feature is provided by the bodyParser() middleware, though other body parsing middleware may follow this convention as well. This property defaults to {} when bodyParser() is used. {@link http://expressjs.com/3x/api.html#req.body}
     * @property {string} query - object containing the parsed query-string, defaulting to empty object - {@link http://expressjs.com/3x/api.html#req.query}
     * @property {User} user - user who did this request, and you can blaim him/her for breaking things
     * @example
     *
     *   Hunt.extendRoutes(function(core){
     *    core.app.get('/error', function(request,response){
     *      throw new Error('Shit happens!');
     *    });
     *   });
     *
     *   Hunt.on('http:error', function(httpError){
     *     console.log(httpError.error.toString());
     *   });
     *   //=> Shit happens!
     *
     */
//error catcher for CSRF protection
    if (!core.config.disableCsrf && error.message === 'invalid csrf token') {
      if (request.is('json')) {
        response.status(400).json({
          'status': 'Error',
          'code': 400,
          'message': 'Invalid CSRF token!'
        });
      } else {
        request.flash('error', 'Wrong CSRF token!');
        response.redirect('back');
      }
//error catcher for all other errors
    } else {
      var errorObject = {
        'error': error.message,
        'errorStack': error.stack,
        'startTime': new Date(request._startTime),
        'duration': (Date.now() - request._startTime),
        'statusCode': 500, //obviously
        'method': request.method,
        'query': request.query,
        'body': request.body,
        'ip': request.ip,
        'ips': request.ips,
        'uri': request.originalUrl,
        'user': request.user || null
      };
      core.emit('http:error', errorObject);
      reportHttpError(core, errorObject);
      next(error);
    }
  });

  if (core.config.env === 'development') {
    core.app.use(require('errorhandler')());
  }

//http://expressjs.com/guide/using-middleware.html#middleware.error-handling
  /* jshint -W098*/
  core.app.use(function (err, request, response, next) {
    console.error(err);
    if (request.is('json')) {
      return response
        .status(500)
        .set('Retry-After', 360)
        .json({
          'status': 'Error',
          'code': 500,
          'message': 'Error 500. There are problems on our server. We will fix them soon!'
        });
    }

    response
      .status(500)
      .set('Content-Type', 'text/html')
      .set('Retry-After', 360)
      .send('<html><head><title>Oops!</title></head><body><h1>Error 500.</h1><p>There are problems on our server. We will fix them soon!</p></body></html>');

  });
  /* jshint +W098*/
//middleware setup finished.
  return core;
};


/**
 * @class request
 * @classdesc
 * {@link http://nodejs.org/api/http.html#http_class_http_server | Nodejs }
 * request object,
 * extended not only by {@link http://expressjs.com/api.html#req.params | ExpressJS },
 * but also by HuntJS. It have some additional objects in it
 *
 * @property {(User|null)} user currently authenticated by means of {@link http://passportjs.org}
 * @property {model} model - shortcut to all Hunt models
 * @property {Object} redisClient - ready to use redis client
 * @property {function} huntEmit - use Hunt event emitter
 * @property {Object} io - Ready to use {@link http://socket.io } object with passport.js integration
 * @property {(Preload|null)} preload - result of usage of {@link Hunt#preload} middleware, containing the {@link Hunt#model} instance
 * @property {Object} files - result of usage of {@link Hunt#multipart} middleware, containing info about uploaded files
 * @see Hunt#redisClient
 * @see Hunt#emit
 */

/**
 * @class response
 * @classdesc
 * {@link http://nodejs.org/api/http.html#http_class_http_serverresponse | Nodejs } response object, extended by {@link http://expressjs.com/api.html#res.status | ExpressJS }
 * Hunt adds some {@link http://expressjs.com/api.html#res.locals | locals} to each response
 * @property {(User|null)} locals.myself - user currently authenticated  by means of {@link http://passportjs.org}
 * @property {boolean} locals.development - set to true on development enviroment, passed to template engine
 * @property {boolean} locals.staging  - set to true on staging enviroment, passed to template engine
 * @property {boolean} locals.production  - set to true on production enviroment, passed to template engine
 * @property {string} locals.csrf - {@link https://en.wikipedia.org/wiki/Cross-site_request_forgery | cross site request forgery } protection token for {@link http://expressjs.com/api.html#csrf | CSRF middleware}
 * @property {Array} locals.css - array of css stylesheets to export to templates
 * @property {Array} locals.js - array of client side javascripts to export to templates
 * @property {Object} locals.flash - flash messages used by {@link https://github.com/jaredhanson/connect-flash | connect-flash middleware}
 */