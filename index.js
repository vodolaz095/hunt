'use strict';

var EventEmitter = require('events').EventEmitter,
  async = require('async'),
  util = require('util'),
  assert = require('assert'),

  configGenerator = require('./lib/misc/config.js'),
  redisGenerator = require('./lib/datastore/redisClient.js'),
  mongooseGenerator = require('./lib/datastore/mongooseModels.js'),
  passportGenerator = require('./lib/http/passport.js'),
  appGenerator = require('./lib/http/expressApp.js'),
  crypt = require('./lib/misc/crypt.js'),

  nodemailerListener = require('./lib/nodemailer.js');


require('colors');
/**
 * @class Hunt
 * @param {config} config - dictionary of configuration parameters
 * @constructor
 * @classdesc
 * Constructor of HuntJS application
 * @fires Hunt#start
 * @fires Hunt#httpError
 * @fires Hunt#httpSuccess
 * @fires Hunt#notify
 * @fires Hunt#notify:all
 * @fires Hunt#notify:email
 * @fires Hunt#notify:sio
 * @fires Hunt#user:save
 * @fires Hunt#user:auth
 * @fires Hunt#broadcast
 * @example
 * var hunt = require('hunt')({
 *  'port': 3000
 * })
 * .extendRoutes(function (core) {
 *    core.app.get('/', function (req, res) {
 *      res.send('Hello, world!');
 *    });
 *  })
 *  .startWebServer();
 */
function Hunt(config) {
  EventEmitter.call(this);

//http://www.crockford.com/javascript/private.html
  var prepared = false,
    extendPassportStrategiesFunctions = [],
    extendAppFunctions = [],
    extendMiddlewareFunctions = [],
    extendRoutesFunctions = [],
    extendTelnetFunctions = {};
  /**
   * @method Hunt#extendCore
   * @param {string} field - property name to assign to hunt.[fieldName]
   * @param {(string|object|Date|Array|function)} value - value to assign
   * @description
   * Inject public property to hunt core.
   * If `value` is function, the `value` injected is result of value(hunt),
   * else `value` injected is AS IS.
   * @returns {Hunt} hunt object for functions chaining
   * @example
   *    var Hunt = require('hunt')(configObj);
   *
   *    //extending application core
   *
   *    //assign value to field
   *    Hunt.extendCore('someVar', 42);
   *
   *    //assign factory function to field and this field value
   *    //is result of this function
   *    Hunt.extendCore('someFuncToGetSomeVar', function (core) {
   *      return core.someVar;
   *    });
   *
   *    //assign function to a core
   *    Hunt.extendCore('getSumWithSomeVar', function (core) {
   *      return function (a, b) {
   *        return a + b + core.someFuncToGetSomeVar;
   *      };
   *    });
   *
   *    //Hunt core works after extending
   *    console.log('Sum of 2, 2 and 42 is ' + Hunt.getSumWithSomeVar(2, 2));
   */
  this.extendCore = function (field, value) {
    if (prepared) {
      throw new Error('Hunt is prepared, unable to run hunt.extendCore');
    } else {
      if (typeof field === 'string' && value !== undefined) {
        if (this[field] === undefined) {
          if (typeof value === 'function') {
            this[field] = value(this);
          } else {
            this[field] = value;
          }
        } else {
          throw new Error('Unable to extend Hunt core. Field "' + field + '" already occupied!');
        }
      } else {
        throw new Error('Unable to inject "' + field + '" with value "' + value + '" into hunt core! Type mismatch.');
      }
      return this;
    }
  };

  /**
   * @name Hunt#config
   * @type {config}
   * @description
   * Object that represents current config object of HuntJS application
   */
  this.extendCore('config', function () {
    return configGenerator(config);
  });


  /**
   * @method Hunt#exportModelToRest
   * @param {ExportModelToRestParameters} parameters - for exporting model to REST interface properly
   * @description
   * Export models as REST api, exposed by current http server
   */

  this.extendCore('exportModelToRest', require('./lib/exportModel/exportModelToRest.js'));

  /**
   * @name Hunt#async
   * @type {Object}
   * @description
   * Embedded {@link https://www.npmjs.org/package/async | npm module of async} for better workflow
   */
  this.extendCore('async', function () {
    return require('async');
  });
  /**
   * @name Hunt#http
   * @type {Object}
   * @description
   * Embedded {@link http://nodejs.org/docs/latest/api/http.html | nodejs http module},
   * that is used by socket.io and http server.
   */
  this.http = require('http');
  this.passport = require('passport');
  this.rack = require('./lib/misc/rack.js');

  /**
   * @name Hunt#version
   * @type {string}
   * @description
   * Current Hunt version
   */
  this.version = require('./package.json').version;

//placeholders, so we cannot break something by Hunt#extendCore
  this.app = 'app';
  this.httpServer = true;
  this.sequelize = {};
  this.mongoConnection = {};
  this.mongoose = {};
  this.io = {};
  this.sessionStorage = true;

  this.encrypt = function (text, secret) {
    secret = secret || this.config.secret;
    return crypt.encrypt(text, secret);
  };

  this.decrypt = function (text, secret) {
    secret = secret || this.config.secret;
    return crypt.decrypt(text, secret);
  };

  redisGenerator(this);

  if (this.config.enableMongoose) {
    mongooseGenerator(this);
  }

  /**
   * @name Hunt#model
   * @type {model}
   * @description
   * Class to hold {@link model | data models} of Hunt application,
   * they are injected into {@link request } object of controller.
   * @see model
   * @see request
   */
  this.model = {};

  /**
   * @method Hunt#extendModel
   * @param {string} modelName - property name to assign to hunt.model[modelName]
   * @param {function} modelConstructor - factory function to generate model using Hunt kernel
   * @see model
   * @description
   * Inject public property with model object to hunt.model.
   * @returns {Hunt} hunt object
   * @example
   * //for mongoose model
   *    if (Hunt.config.enableMongoose) { //verify that we enabled mongoose
   *      Hunt.extendModel('Trophy', function (core) {
   *        var TrophySchema = new core.mongoose.Schema({
   *          'name': {type: String, unique: true},
   *          'scored': Boolean
   *        });
   *
   *        TrophySchema.index({
   *          name: 1
   *        });
   * //this step is very important - bind mongoose model to current mongo database connection
   * // and assign it to collection in mongo database
   *        return core.mongoConnection.model('Trophy', TrophySchema);
   *       });
   * // So, this model is accessible by
   * // Hunt.model.Trophy
   *     };
   *
   * //sequilize model
   * Hunt.extendModel('Planet', function (core) {
   *     var Planet = core.sequelize.define('Planet', {
   *       name: core.Sequelize.STRING //note that core.Sequilize != core.sequilize
   *     });
   *     return Planet;
   *   });
   */
  this.extendModel = function (modelName, modelConstructor) {
    if (prepared) {
      throw new Error('Hunt is prepared, unable to run hunt.extendModel');
    } else {
      if (this.model[modelName] === undefined) {
        if (typeof modelName === 'string' && typeof modelConstructor === 'function') {
          this.model[modelName] = modelConstructor(this);
        } else {
          throw new Error('Unable to inject "' + modelName + '" into core! Wrong arguments!');
        }
      } else {
        throw new Error('Unable to inject "' + modelName + '" into core! Model is already defined!');
      }
      return this;
    }
  };

  /**
   * @method Hunt#extendStrategy
   * @description
   * Add new passportJS strategy to application by adding them to Hunt.passport object
   * All strategies have to redirect to `/auth/success` on success or `/auth/failure`
   * @param {object} Strategy object
   * @see passport
   * @example
   *
   *    var HashStrategy = require('passport-hash').Strategy;
   *    //used for verify account by email
   *    exports.strategy = function (core) {
   *      return new HashStrategy(function (hash, done) {
   *        core.model.User.findOneByHuntKeyAndVerifyEmail(hash, function (err, userFound) {
   *          done(err, userFound);
   *        });
   *      });
   *    };
   *
   *    exports.routes = function (core) {
   *      core.app.get('/auth/confirm/:hash', core.passport.authenticate('hash', {
   *        successRedirect: '/auth/success',
   *        failureRedirect: '/auth/failure'
   *      }));
   *    };
   * 
   * @returns {Hunt} hunt object
   */
  this.extendStrategy = function (Strategy) {
    if (typeof Strategy.strategy === 'function' && typeof Strategy.routes === 'function') {
      extendPassportStrategiesFunctions.push(Strategy);
    } else {
      throw new Error('Unable to extend passportjs strategies by Hunt.extendStrategy() with argument ' + JSON.stringify(Strategy) + '!');
    }
    return this;
  };

  /**
   * @method Hunt#extendApp
   * @see Hunt#app
   * @description
   * Set expressJS application parameters - template engine, variables, locals
   * {@link http://expressjs.com/api.html#app.engine| template engines},
   * {@link http://expressjs.com/api.html#app.locals | locals} and
   * {@link http://expressjs.com/api.html#app-settings | other}
   * settings.
   * In code it is called after setting logging middleware and port.
   *
   * @param {(string|Array|null)} environment - application environment to use,
   * can be something like 'development', ['development','staging'] or null
   *
   * @param {function} settingsFunction - function(core){....}
   * @example
   *
   * 
   *     //example of setting template engine
   *     hunt.extendApp = function (core) {
   *       core.app.set('views', __dirname + '/views');
   *       core.app.set('view engine', 'ejs');
   *       core.app.set('layout', 'layout');
   *       core.app.enable('view cache');
   *       core.app.engine('html', require('ejs'));
   *     };
   * 
   *
   * @returns {Hunt} hunt object
   */
  this.extendApp = function (environment, settingsFunction) {
    if (prepared) {
      throw new Error('Hunt core application is already prepared! WE CAN\'T EXTEND IT NOW!');
    } else {
      var environmentToUse = null,
        i,
        j;
      if (settingsFunction === undefined) {
        settingsFunction = environment;
        environment = null;
      }
      if (typeof environment === 'string') {
        environmentToUse = [];
        environmentToUse.push(environment);
      }
      if (environment instanceof Array) {
        environmentToUse = environment;
        for (i = 0; i < environment.length; i = i + 1) {
          if (typeof environment[i] !== 'string') {
            throw new Error('Hunt.extendApp requires environment name to be a string!');
          }
        }
      }
      if (typeof settingsFunction === 'function') {
        if (environmentToUse) {
          for (j = 0; j < environmentToUse.length; j = j + 1) {
            extendAppFunctions.push({
              'environment': environmentToUse[j],
              'settingsFunction': settingsFunction
            });
          }
        } else {
          extendAppFunctions.push({
            'settingsFunction': settingsFunction
          });
        }
      } else {
        throw new Error('Wrong arguments for extendApp(arrayOrStringOfEnvironments,settingsFunction)');
      }
      return this;
    }
  };

  /**
   * @method Hunt#extendMiddleware
   * @description
   * Adds new middleware to expressJS application
   * This function can be executed multiple times, the middlewares applied
   * are used in application in *order* they were issued by this function.
   * First argument (array of enviroments), and the second one
   * (the path where to use middleware, the default is "/") are OPTIONAL
   * They are applied after setting default exposed internals middleware and before
   * setting router middleware.
   *
   * @param {(String|Array|undefined)} environment - application enviroment to use,
   * can be something like 'development', ['development','staging'] or null
   * (for ALL enviroments)
   * @param {(String/undefined)} [path=/] path to mount middleware - default is /
   * @param {function} settingsFunction function(core){ return function(req,res,next){.....}}
   * @example
   * 
   *
   *     hunt.extendMiddleware(function(core){
   *       return function(req, res, next){
   *         res.setHeader('X-hunt','YES!');
   *         next();
   *       };
   *     };
   *
   *     hunt.extendMiddleware('production',function(core){
   *       return function(req, res, next){
   *         res.setHeader('X-production','YES!');
   *         next();
   *       };
   *     };
   *
   *     hunt.extendMiddleware(['production','staging'],'/somepath',function(core){
   *       return function(req, res, next){
   *          if(!request.user){
   *            response.send(403);
   *          } else {
   *            next();
   *          }
   *       };
   *     };
   *
   *    Hunt.extendMiddleware(function (core) {
   *      return function (req, res, next) {
   *        res.setHeader('globMiddleware', core.someVar);
   *        next();
   *      };
   *    });
   *
   *    //setting middleware for production environment only
   *    Hunt.extendMiddleware('production', function (core) {
   *      return function (req, res, next) {
   *        res.setHeader('prodMiddleware', core.someVar);
   *        next();
   *      };
   *    });
   *    //setting middleware for development environment only
   *    Hunt.extendMiddleware('development', function (core) {
   *      return function (req, res, next) {
   *        res.setHeader('devMiddleware', core.someVar);
   *        next();
   *      };
   *    });
   *    //setting middleware for specified path and development environment only
   *    Hunt.extendMiddleware('development', '/somePath', function (core) {
   *      return function (req, res, next) {
   *        res.setHeader('devMiddleware1', core.someVar);
   *        next();
   *      };
   *    });
   *    //setting middleware for specified path and production/staging environments only
   *    Hunt.extendMiddleware(['production','staging'], '/somePath', function (core) {
   *      return function (req, res, next) {
   *        res.setHeader('devMiddleware2', core.someVar);
   *        next();
   *      };
   *    });
   *    //setting middleware, that asks user to verify his/her email address
   *    Hunt.extendMiddleware(function (core) {
   *      return function(req,res,next){
   *        if(req.user){
   *          if (req.user.accountVerified) {
   *            next();
   *          } else {
   *            req.flash('error','Verify your email address please!');
   *            next();
   *          }
   *        } else {
   *          next();
   *        }
   *      };
   *    });
   * 
   * @returns {Hunt} hunt object
   */
  this.extendMiddleware = function (environment, path, settingsFunction) {
    if (prepared) {
      throw new Error('Hunt core application is already prepared! WE CAN\'T EXTEND IT NOW!');
    } else {
      var environmentToUse = null,
        pathToUse = '/',
        settingsFunctionToUse = null,
        k,
        l;

      if (typeof environment === 'function' && path === undefined && settingsFunction === undefined) {
        settingsFunctionToUse = environment;
      }

      if (typeof environment === 'string' || environment instanceof Array) {

        if (typeof environment === 'string') {
          environmentToUse = [];
          environmentToUse.push(environment);
        }
        if (environment instanceof Array) {
          environmentToUse = environment;
          for (k = 0; k < environment.length; k = k + 1) {
            if (typeof environment[k] !== 'string') {
              throw new Error('Hunt.extendMiddleware(environment, path, settingsFunction) requires environment name to be a string or array of strings!');
            }
          }
        }
        if (typeof path === 'string') {
          if (/^\//.test(path)) {
            pathToUse = path;
            if (typeof settingsFunction === 'function') {
              settingsFunctionToUse = settingsFunction;
            }
          } else {
            throw new Error('Hunt.extendMiddleware(environment, path, settingsFunction) requires path to be a valid middleware path, that starts from "/"!');
          }
        } else {
          if (typeof path === 'function') {
            settingsFunctionToUse = path;
          }
        }
      }

      if (settingsFunctionToUse) {
        if (environmentToUse) {
          for (l = 0; l < environmentToUse.length; l = l + 1) {
            extendMiddlewareFunctions.push({
              'environment': environmentToUse[l],
              'path': pathToUse || '/',
              'SettingsFunction': settingsFunctionToUse
            });
          }
        } else {
//we set middleware for all environments
          extendMiddlewareFunctions.push({
            'path': pathToUse || '/',
            'SettingsFunction': settingsFunctionToUse
          });
        }
      } else {
        throw new Error('Wrong arguments for function Hunt.extendMiddleware(environmentArrayOrStrings, [path], settingsFunction(core){...})');
      }
      return this;
    }
  };

  /**
   * @method Hunt#extendRoutes
   * @param {function} settingsFunction Settings Function
   * @description
   * Adds {@link http://expressjs.com/api.html#app.VERB | application routes and verbs} for them.
   * The {@link https://github.com/visionmedia/express-resource | REST api helper} npm module is already provided
   * @example
   * 
   *     hunt.extendRoutes(function(core){
   *       core.app.get('/', function(req,res){
   *         res.send('Hello!');
   *       });
   *       core.app.resource('forum', require('./forum.js'));
   *       core.app.all('*',function(req,res){
   *         res.send(404);
   *       });
   *     }
   * 
   * @returns {Hunt} hunt object
   */
  this.extendRoutes = function (settingsFunction) {
    if (prepared) {
      throw new Error('Hunt core application is already prepared! WE CAN\'T EXTEND IT NOW!');
    } else {
      if (typeof settingsFunction === 'function') {
        extendRoutesFunctions.push(settingsFunction);
      } else {
        throw new Error('Wrong argument for Hunt.extendAppRoutes(function(core){...});');
      }
      return this;
    }
  };


  /**
   * @method Hunt#extendTelnet
   * @param {string} command - command name
   * @param {function} callback - function(core, client, payload){}
   * @description
   * Adds new behavior to telnet server. The callback has 2
   * arguments, first one is core object, and second one is
   * {@link https://github.com/andris9/rai | RAI client object }
   * @example
   * 
   *
   *     hunt.extendTelnet('version', function(core, client){
   *      client.send('HuntJS version is '+core.version);
   *     });
   *     hunt.extendTelnet('echo', function(core, client, payload){
   *      client.send(payload);
   *     });
   *
   * 
   * @since 0.0.18
   * @returns {Hunt} hunt object
   */

  this.extendTelnet = function (command, callback) {
    command = command.toLowerCase();
    if (extendTelnetFunctions[command] === undefined) {
      extendTelnetFunctions[command] = callback;
    } else {
      throw new Error('Telnet server behavior for command of "' + command + '" is already defined!');
    }
  };

  /**
   * @class model
   * @classdesc
   * Class to hold data models of Hunt application, they are injected into
   * request object. This models can be loaded by
   * {@link Hunt#extendModel} function as mongoose or sequilize
   * active record objects
   * @property {User} Users - class, that represents site/application user
   * @property {User} User - synonim for {@link User}
   * @property {User} user - synonim for {@link User}
   * @property {User} users - synonim for {@link User}
   * @property {Message} Message - Class for messages send by users to groups
   * @property {Message} messages - synonim for {@link Message}
   * @property {Message} message - synonim for {@link Message}
   * @see Hunt#extendModel
   */
  function injectModels(h) {
    if (h.config.enableMongoose && h.config.enableMongooseUsers) {
      var mongooseUsers = require('./lib/models/user.mongoose.js'),
        mongooseMessages = require('./lib/models/message.mongoose.js');
//user model
      h.extendModel('User', mongooseUsers);
      h.model.Users = h.model.User;
      h.model.user = h.model.User;
      h.model.users = h.model.User;
//sanity checks on model
      [
        'findOneByHuntKey', 'findOneByEmail', 'findOneFuzzy',
        'signUp', 'signIn', 'findOneByHuntKeyAndVerifyEmail', 'findOneByHuntKeyAndResetPassword',
        'processOAuthProfile'
      ].map(function (f) {
          assert(typeof h.model.User[f] === 'function', 'Hunt.model.User.' + f + ' is not a function!');
        });

//private messages model
      h.extendModel('Message', mongooseMessages);
      h.model.Messages = h.model.Message;
      h.model.messages = h.model.Message;
      h.model.message = h.model.Message;
    }
    nodemailerListener(h);
  }

  function buildExpressApp(h) {
    passportGenerator.call(h, extendPassportStrategiesFunctions, extendRoutesFunctions);
    appGenerator.call(h, extendAppFunctions, extendMiddlewareFunctions, extendRoutesFunctions);
  }

  function buildTelnet(h) {
    h.extendedCommands = extendTelnetFunctions;
  }


  /**
   * @method Hunt#startBackGround
   * @fires Hunt#start
   * @description
   * Starts Hunt application as single threaded background application
   * It have redis client and data models, event emitting system exposed.
   * It makes Hunt to emit event of "start" with payload of `{'type':'background'}`
   * @example
   * 
   *     Hunt.startBackGround();
   * 
   */
  this.startBackGround = function () {
    console.log('Trying to start Hunt as background service...'.magenta);
    injectModels(this);
    prepared = true;
    /**
     * Emitted when Hunt is started as background process
     *
     * @see Hunt#startBackGround
     * @event Hunt#start
     * @type {object}
     * @property {string} type - with a value of string of 'background'
     */
    this.emit('start', {'type': 'background'});
    console.log(('Started Hunt as background service with PID#' + process.pid + '!').green);
  };


  /**
   * @method Hunt#startWebServer
   * @fires Hunt#start
   * @description
   * Starts Hunt application as single threaded web server
   * It have redis client/models, expressJS application and event emitting system exposed.
   * It makes Hunt to emit event of "start" with payload of `{'type':'webserver',  'port':80}`
   * @param {(number|null)} port - what port to use, if null - use port value from config
   * @param {(string|null)} address - what address to bind to. Default is '0.0.0.0' - all IPv4 addresses. The address is populated from environment address of HUNTJS_ADDR
   * @example
   * 
   *     Hunt.startWebServer(80);
   *     Hunt.startWebServer(80, '0.0.0.0');
   *     Hunt.startWebServer(80, 'fe80::7218:8bff:fe86:542b');
   * 
   */
  this.startWebServer = function (port, address) {
    var p = port || this.config.port,
      address = address || this.config.address || '0.0.0.0';
    console.log(('Trying to start Hunt as web server on ' + address + ':' + p + '...').magenta);
    injectModels(this);
    buildExpressApp(this);
    var h = this;
    this.httpServer.listen(p, address, function () {
      /**
       * Emitted when Hunt is started as webserver process
       *
       * @see Hunt#startWebServer
       *
       * @event Hunt#start
       * @type {object}
       * @property {string} type - with a value of string of 'webserver'
       * @property {number} port - with a value of port this application listens to
       * @property {string} address - with a value of address application is bound to
       */
      h.emit('start', {'type': 'webserver', 'port': p, 'address': address});
      console.log(('Started Hunt as web server on port ' + p + ' with PID#' + process.pid + '!').green);
      prepared = true;
    });
  };

  /**
   * @method Hunt#startTelnetServer
   * @param {(number|null)} port what port to use, if null - use port value from config
   * @param {(string|null)} [address="0.0.0.0"] - address to listen on, if null - use address from config
   * @fires Hunt#start
   * @since 0.0.18
   * @description
   * Start Hunt as single process telnet server
   * @example
   * 
   *     Hunt.startTelnetServer(3003);
   * 
   */
  this.startTelnetServer = function (port, address) {
    var p = port || this.config.port,
      address = address || this.config.address || '0.0.0.0';
    console.log(('Trying to start Hunt as telnet server on port ' + p + '...').magenta);
    this.extendCore('telnetHandler', require('./lib/telnet/telnet.js'));
    injectModels(this);
    buildTelnet(this);
    prepared = true;
    var RAIServer = require("rai").RAIServer,
      telnetServer = new RAIServer(this.config.telnetServer);

    telnetServer.on('connect', this.telnetHandler);

    telnetServer.on('error', function (error) {
      throw error;
    });
    var thishunt = this;
    telnetServer.listen(p, address, function (error) {
      if (error) {
        throw error;
      } else {
        /**
         * Emitted when Hunt is started as telnet process
         *
         * @see Hunt#startTelnetServer
         * @event Hunt#start
         * @type {object}
         * @property {string} type - with a value of string of 'telnet'
         * @property {string} port - with a value of string of port number
         * @property {string} address - with a value of address application is bound to
         */
        thishunt.emit('start', {'type': 'telnet', 'port': p, 'address': address});
        console.log(('Started Hunt as telnet server on ' + address + ':' + p + '!').green);
      }
    });
    return this;
  };


  /**
   * @method Hunt#startWebCluster
   * @param {(number|null)} port what port to use, if null - use port value from config
   * @param {(number|null)} maxProcesses maximal number of web server processes to spawn, default - 1 process per CPU core
   * @description
   * Starts hunt application as single threaded background application,
   * that controls, by the means of {@link http://nodejs.org/docs/latest/api/cluster.html | nodejs embedded cluster},
   * web server processes. By default it spawns 1 process per CPU core.
   * It makes Hunt to emit event of "start" with payload of `{'type':'background'}`
   * in master process, and events of "start" with payload of `{'type':'webserver',  'port':80}`
   * in web server processes.
   * @fires Hunt#start
   * @returns {Boolean} true if this is master process, false if this is worker process.
   * @example
   * 
   *     Hunt.startWebCluster(80, 10000);
   * 
   */
  this.startWebCluster = function (port, maxProcesses) {
    var p = port || this.config.port,
      m = maxProcesses || 'max';

    return this.startCluster({'port': p, 'web': m, 'telnet': 0, 'background': 0});
  };

  /**
   * @method Hunt#startTelnetCluster
   * @param {(number|null)} port what port to use, if null - use port value from config
   * @param {(number|null)} maxProcesses maximal number of web server processes to spawn, default - 1 process per CPU core
   * @description
   * Starts hunt application as single threaded background application,
   * that controls, by the means of {@link http://nodejs.org/docs/latest/api/cluster.html | nodejs embedded cluster},
   * telnet server processes. By default it spawns 1 process per CPU core.
   * It makes Hunt to emit event of "start" with payload of `{'type':'background'}`
   * in master process, and events of "start" with payload of `{'type':'telnet',  'port':25}`
   * in each of telnet server processes.
   * @fires Hunt#start
   * @returns {Boolean} true if this is master process, false if this is worker process.
   * @example
   * 
   *     Hunt.startTelnetCluster(25, 10000);
   * 
   */
  this.startTelnetCluster = function (port, maxProcesses) {
    var p = port || this.config.port,
      m = maxProcesses || 'max';

    return this.startCluster({'port': p, 'web': 0, 'telnet': m, 'background': 0});
  };

  /**
   * @method Hunt#startBackGroundCluster
   * @fires Hunt#start
   * @param {(Number|null)} maxProcesses maximal number of web server processes to spawn, default - 1 process per CPU core
   * @description
   * Starts Hunt application as single threaded background application, that controls, by the means of
   * {@link http://nodejs.org/docs/latest/api/cluster.html | cluster}, other background applications.
   * By default it spawns 1 process per CPU core.
   * @returns {Boolean} true if this is master process, false if this is worker process.
   * @example
   * 
   *
   *    var numberOfProcessesToSpawn = 10;
   *    Hunt.startBackGroundCluster(numberOfProcessesToSpawn);
   *
   * 
   */
  this.startBackGroundCluster = function (maxProcesses) {
    console.log(('Trying to start Hunt as background cluster service...').magenta);
    this.startCluster({'web': 0, 'telnet': 0, 'background': maxProcesses})
  };

  /**
   * @method Hunt#startCluster
   * @param {object} parameters - configuration parameters
   * @fires Hunt#start
   * @description
   * Start Hunt as cluster. `Parameters` is object with 4 field -
   * - `web`, `background`, `telnet`, 'port'.
   * The values of `web`,`background`, `telnet` are number of child processes to spawn.
   * The value of `port` is port number for web server processes to listen to.
   * It is worth notice, that in this case telnet server listens on `Hunt.config.port+1` port!
   * @returns {Boolean} true if this is master process, false if this is worker process.
   * @example
   * 
   *     Hunt.startCluster({ 'web':1, 'background':1, 'telnet': 1 });
   *     Hunt.startCluster({ 'web':max, 'port':80 });
   *     Hunt.startCluster({ 'background':max });
   *     Hunt.startCluster({ 'telnet':max, 'port':25 });
   *     Hunt.startCluster({ 'web':max, 'telnet':max }); //i strongly do not reccomend doing this!
   *
   * 
   */
  this.startCluster = function (parameters) {

    var cluster = require('cluster'),
      numCPUs = require('os').cpus().length,
      maxWorkers = Math.min(this.config.maxWorkers, numCPUs),
      runtimeConfig = {},
      i = 0;

    ['web', 'background', 'telnet'].map(function (a) {
      if (parameters[a] === 'max') {
        runtimeConfig[a] = maxWorkers;
      }
      if (parseInt(parameters[a])) {
        runtimeConfig[a] = parameters[a];
      }
      if (!parameters[a]) {
        runtimeConfig[a] = 0;
      }
    });

    runtimeConfig.port = parseInt(parameters.port) || config.port || 3000;
    runtimeConfig.address = parameters.port || config.address;

    if ((runtimeConfig.web + runtimeConfig.background + runtimeConfig.telnet ) <= maxWorkers) {

      if (cluster.isMaster) {
        console.log(('Cluster : We have ' + numCPUs + ' CPU cores present. We can use ' + maxWorkers + ' of them.').bold.green);
        console.log(('Cluster : We need to spawn ' + runtimeConfig.web + ' web server processes!').magenta);
        console.log(('Cluster : We need to spawn ' + runtimeConfig.background + ' background processes!').magenta);
        console.log(('Cluster : We need to spawn ' + runtimeConfig.telnet + ' telnet server processes!').magenta);
        console.log(('Cluster : Also we need to spawn 1 background processes to rule them all!').magenta);
        console.log(('Cluster : Starting spawning processes...').magenta);

        console.log(('Cluster : Master PID#' + process.pid + ' is online!').green);
// Fork workers.
        for (i = 0; i < runtimeConfig.web; i = i + 1) {
          var worker = cluster.fork();
          worker.send('be_webserver');
          console.log(('Cluster : Spawning web server worker #' + i + ' with PID#' + worker.process.pid + '...').yellow);
        }

        for (i = 0; i < runtimeConfig.background; i = i + 1) {
          var worker = cluster.fork();
          worker.send('be_background');
          console.log(('Cluster : Spawning background worker #' + i + ' with PID#' + worker.process.pid + '...').yellow);
        }
        for (i = 0; i < runtimeConfig.telnet; i = i + 1) {
          var worker = cluster.fork();
          worker.send('be_telnet');
          console.log(('Cluster : Spawning telnet server worker #' + i + ' with PID#' + worker.process.pid + '...').yellow);
        }


        cluster.on('online', function (worker) {
          console.log(('Cluster : Worker PID#' + worker.process.pid + ' is online!').green);
        });

        cluster.on('exit', function (worker, code, signal) {
          var exitCode = worker.process.exitCode;
          console.log(('Cluster : Worker #' + worker.process.pid + ' died (' + exitCode + ')! Trying to spawn spare one...').red);
          cluster.fork();
        });
        this.startBackGround(); // the master process is ran as background application
        return true;
      } else {
        var h = this;
        process.on('message', function (msg) {
          switch (msg) {
            case 'be_background':
              h.startBackGround(); // the child process is ran as background application
              break;
            case 'be_webserver':
              h.startWebServer(runtimeConfig.port, runtimeConfig.address);
              break;
            case 'be_telnet':
              if (runtimeConfig.web > 0) {
                h.startTelnetServer((runtimeConfig.port + 1), runtimeConfig.address);
              } else {
                h.startTelnetServer(runtimeConfig.port, runtimeConfig.address);
              }
              break;
            default:
              throw new Error('Unknown command of `' + msg + '` from master process!');
          }
        });
        return false;
      }
    } else {
      throw new Error('This configuration requires more workers, than allowed by `config.maxWorkers`! ');
    }
  };
}

/**
 * @method Hunt#on
 * @param {string} eventName
 * @param {function} listener
 * @returns {Hunt}
 * @see Hunt#once
 * @description
 * Adds a listener to the end of the listeners array for the specified event.
 * Calls can be chained.
 * Hunt object is a {@link http://nodejs.org/docs/latest/api/events.html | standard nodejs event emitter object }, so it supports all event emitter methods.
 * @example
 * 
 *    Hunt.on('start', function (params) {
 *      console.log('Hunt is started as '+params.type+' on port '+params.port);
 *    }).on('httpError', console.error);
 * 
 */

/**
 * @method Hunt#once
 * @param {string} eventName
 * @param {function} listener
 * @returns {Hunt}
 * @description
 * Adds a one time listener for the event. This listener is invoked only the next time the event is fired, after which it is removed.
 * Calls can be chained.
 * Hunt object is a {@link http://nodejs.org/docs/latest/api/events.html | standard nodejs event emitter object }, so it supports all event emitter methods.
 * @see Hunt#on
 */

/**
 * @method Hunt#removeListener
 * @param {string} eventName
 * @param {function} listener
 * @returns {Hunt} Hunt
 * @description
 * Hunt object is a {@link http://nodejs.org/docs/latest/api/events.html | standard nodejs event emitter object }, so it supports all event emitter methods.
 * Remove a listener from the listener array for the specified event.
 * Caution: changes array indices in the listener array behind the listener.
 * Calls can be chained.
 */

/**
 * @method Hunt#emit
 * @param {string} eventName
 * @param {object} payload
 * @return boolean
 * @description
 * Makes Hunt emit an event. Returns true if event had listeners, false otherwise.
 * Hunt object is a {@link http://nodejs.org/docs/latest/api/events.html | standard nodejs event emitter object }, so it supports all event emitter methods.
 */

util.inherits(Hunt, EventEmitter);

/**
 * @method Hunt#stop
 * @description
 * Stops the current application - close database connections, etc.
 */
Hunt.prototype.stop = function () {
  this.redisClient.end();
  if (this.mongoose && this.mongoose.connection) {
    this.mongoose.connection.close();
    this.mongoose.disconnect();
  }
  if (this.sequelize) {
    //todo - do disconnection to SQL database
  }

  delete this;
  console.log('Hunt is stopped!'.green + '\n');
};

/**
 * HuntJS framework module
 * @module Hunt
 * @constructs Hunt
 * @param {config} config - key-value object with settings
 */
module.exports = exports = function (config) {
  return new Hunt(config);
};
