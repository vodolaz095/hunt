'use strict';
var EventEmitter = require('events').EventEmitter,
  async = require('async'),
  util = require('util'),
  configGenerator = require('./lib/configGenerator.js'),
  redisGenerator = require('./lib/dataStorage/redisClientGenerator.js'),
  mongooseGenerator = require('./lib/dataStorage/mongooseModelsGenerator.js'),
  sequelizeGenerator = require('./lib/dataStorage/sequilizeModelsGenerator.js'),
  passportGenerator = require('./lib/passportGenerator.js'),
  nodemailerListener = require('./lib/nodemailerListener.js'),
  appGenerator = require('./lib/appGenerator.js'),
  crypt = require('./lib/crypt.js');

require('colors');
/**
 * @class Hunt
 * @param {config} config
 * @constructor
 */
function Hunt(config) {
  EventEmitter.call(this);
  this.config = configGenerator(config);

//guarding core internals from Hunt.extendCore
/**
  * @name Hunt#async
  * @type {Object}
  * @description
  * Embedded {@link https://www.npmjs.org/package/async | npm module of async} for better workflow
  */
  this.async = require('async');

  this.app = 'app';
/**
 * @name Hunt#http
 * @type {Object}
 * @description
 * Embedded {@link http://nodejs.org/docs/latest/api/http.html | nodejs http module},
 * that is used by socket.io and http server.
 */
  this.http = require('http');

  this.rack = require('./lib/rack.js');
  this.httpServer = true;
  this.passport = require('passport');
  this.model = {};
  this.sequelize = {};
  this.mongoConnection = {};
  this.mongoose = {};
  this.io = {};

  this.encrypt = function(text, secret){
    secret = secret || this.config.secret;
    return crypt.encrypt(text, secret);
  }
  this.decrypt = function(text, secret){
    secret = secret || this.config.secret;
    return crypt.decrypt(text, secret);
  }

  redisGenerator(this);

  if (this.config.enableMongoose) {
    mongooseGenerator(this);
  }

  if (this.config.sequelizeUrl) {
    sequelizeGenerator(this);
  }

//http://www.crockford.com/javascript/private.html
  var prepared = false,
    extendPassportStrategiesFunctions = [],
    extendAppFunctions = [],
    extendMiddlewareFunctions = [],
    extendRoutesFunctions = [];

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
   *```javascript
   *
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
   *```
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
   * @name Hunt#model
   * @type {model}
   * @description
   * Class to hold {@link model | data models} of Hunt application,
   * they are injected into request object of controller.
   * @see model
   * @see request
   */

  /**
   * @method Hunt#extendModel
   * @param {string} modelName - property name to assign to hunt.model[modelName]
   * @param {function} modelConstructor - factory function to generate model using Hunt kernel
   * @see model
   * @description
   * Inject public property with model object to hunt.model.
   * @returns {Hunt} hunt object
   * @example
   * ```javascript
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
   * ```
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
   * ```javascript
   *    var HashStrategy = require('passport-hash').Strategy;
   *    //used for verify account by email
   *    exports.strategy = function (core) {
   *      return new HashStrategy(function (hash, done) {
   *        core.model.User.findOneByApiKeyAndVerifyEmail(hash, function (err, userFound) {
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
   * ```
   * @returns {Hunt} hunt object
   */
  this.extendStrategy = function (Strategy) {
    if (typeof Strategy.strategy === 'function' && typeof Strategy.routes === 'function') {
      extendPassportStrategiesFunctions.push(Strategy);
    } else {
      throw new Error('Unable to extend passportjs strategies by Hunt.extendStrategy() with argument ' + JSON.stringify(Strategy) + '!');
    }
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
   * ```javascript
   *     //example of setting template engine
   *     hunt.extendApp = function (core) {
   *       core.app.set('views', __dirname + '/views');
   *       core.app.set('view engine', 'ejs');
   *       core.app.set('layout', 'layout');
   *       core.app.enable('view cache');
   *       core.app.engine('html', require('ejs'));
   *     };
   * ```
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
   * ```javascript
   *
   *     hunt.extendMiddleware(function(core){
   *       return function(req, res, next){
   *         res.setHeader('X-hunt','YES!');
   *       };
   *     };
   *
   *     hunt.extendMiddleware('production',function(core){
   *       return function(req, res, next){
   *         res.setHeader('X-production','YES!');
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
   * ```
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
   * ```javascript
   *     hunt.extendRoutes(function(core){
   *       core.app.get('/', function(req,res){
   *         res.send('Hello!');
   *       });
   *       core.app.resource('forum', require('./forum.js'));
   *       core.app.all('*',function(req,res){
   *         res.send(404);
   *       });
   *     }
   * ```
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

  function prepareHunt(h, buildApp) {
    if (h.config.enableMongoose && h.config.enableMongooseUsers) {
      var mongooseUsers = require('./models/user.mongoose.js'),
        mongooseMessages = require('./models/message.mongoose.js'),
        mongooseGroups = require('./models/group.mongoose.js'),
        mongooseGroupMessages = require('./models/groupmessage.mongoose.js');
//user model
      h.extendModel('User', mongooseUsers);
      h.model.Users = h.model.User;
      h.model.user = h.model.User;
      h.model.users = h.model.User;

//private messages model
      h.extendModel('Message', mongooseMessages);
      h.model.Messages = h.model.Message;
      h.model.messages = h.model.Message;
      h.model.message = h.model.Message;

//groups model
      h.extendModel('Group', mongooseGroups);
      h.model.Groups = h.model.Group;
      h.model.groups = h.model.Group;
      h.model.group = h.model.Group;

//group message model
      h.extendModel('GroupMessage', mongooseGroupMessages);
    }
    if(buildApp){
      passportGenerator(h, extendPassportStrategiesFunctions, extendRoutesFunctions);
      appGenerator(h, extendAppFunctions, extendMiddlewareFunctions, extendRoutesFunctions);
    }
    nodemailerListener(h);
    prepared = true;
  }

  /**
   * @method Hunt#startBackGround
   * @description
   * Starts Hunt application as single threaded background application
   * It have redis client/models, event emitting system exposed.
   * It makes Hunt to emit event of "start" with payload of `{'type':'background'}`
   * @example
   * ```javascript
   *     Hunt.startBackGround();
   * ```
   */
  this.startBackGround = function () {
    console.log('Trying to start Hunt as background service...'.magenta);
    prepareHunt(this, false);
    /**
     * Emitted when Hunt is started as background process
     *
     * @see Hunt#startBackGround
     * @event Hunt#start
     * @type {object}
     * @property {string} type - with a value of string of 'background'
     */
    this.emit('start', {'type': 'background'});
    console.log('Started Hunt as background service!'.green);
  };


  /**
   * @method Hunt#startWebServer
   * @description
   * Starts Hunt application as single threaded web server
   * It have redis client/models, expressJS application and event emitting system exposed.
   * It makes Hunt to emit event of "start" with payload of `{'type':'webserver',  'port':80}`
   * @param {(number|null)} port what port to use, if null - use port value from config
   * @example
   * ```javascript
   *     Hunt.startWebServer(80);
   * ```
   */
  this.startWebServer = function (port) {
    var p = port || this.config.port;
    console.log(('Trying to start Hunt as web server on port ' + p + '...').magenta);
    prepareHunt(this, true);
    var h = this;
    this.httpServer.listen(p, function () {
    /**
     * Emitted when Hunt is started as webserver process
     *
     * @see Hunt#startWebServer
     *
     * @event Hunt#start
     * @type {object}
     * @property {string} type - with a value of string of 'webserver'
     * @property {number} port - with a value of port this application listens to
     */
        h.emit('start', {'type': 'webserver', 'port': p});
        console.log(('Started Hunt as web server on port ' + p + '!').green);
    });
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
   *
   * @returns {Boolean} true if this is master process, false if this is worked process.
   * @example
   * ```javascript
   *     Hunt.startWebCluster(80, 10000);
   * ```
   */
  this.startWebCluster = function (port, maxProcesses) {
    var p = port || this.config.port;
    console.log(('Trying to start Hunt as webcluster service on port ' + p + '...').magenta);

    var cluster = require('cluster'),
      numCPUs = require('os').cpus().length,
      maxWorkers = Math.min(this.config.maxWorkers, maxProcesses || 16),
      i;

    if (cluster.isMaster) {
      console.log(('Cluster : We have ' + numCPUs + ' CPU cores present. We can use ' + maxWorkers + ' of them.').bold.green);
      console.log(('Cluster : Master PID#' + process.pid + ' is online').green);
      // Fork workers.
      for (i = 0; i < maxWorkers; i = i + 1) {
        var worker = cluster.fork();
        console.log(('Cluster : Spawning worker with PID#' + worker.process.pid).green);
      }

      cluster.on('online', function (worker) {
        console.log(('Cluster : Worker PID#' + worker.process.pid + ' is online').green);
      });

      cluster.on('exit', function (worker, code, signal) {
        var exitCode = worker.process.exitCode;
        console.log(('Cluster : Worker #' + worker.process.pid + ' died (' + exitCode + '). Respawning...').yellow);
        cluster.fork();
      });
      this.startBackGround(); // the master process is ran as background application and do not listens to port
      return true;
    } else {
      this.startWebServer(p);
      return false;
    }
  };

  /**
   * @method Hunt#startBackGroundCluster
   * @param {(Number|null)} maxProcesses maximal number of web server processes to spawn, default - 1 process per CPU core
   * @description
   * Starts hunt application as single threaded background application, that controls, by the means of
   * [cluster](http://nodejs.org/docs/latest/api/cluster.html), other background applications.
   * By default it spawns 1 process per CPU core.
   * @returns {Boolean} true if this is master process, false if this is worked process.
   */
  this.startBackGroundCluster = function (maxProcesses) {
    console.log(('Trying to start Hunt as background cluster service...').magenta);

    var cluster = require('cluster'),
      numCPUs = require('os').cpus().length,
      maxWorkers = Math.min(this.config.maxWorkers, maxProcesses),
      i;

    if (cluster.isMaster) {
      console.log(('Cluster : We have ' + numCPUs + ' CPU cores present. We can use ' + maxWorkers + ' of them.').bold.green);
      console.log(('Cluster : Master PID#' + process.pid + ' is online').green);
      // Fork workers.
      for (i = 0; i <= maxWorkers; i = i + 1) {
        var worker = cluster.fork();
        console.log(('Cluster : Spawning worker with PID#' + worker.process.pid).green);
      }

      cluster.on('online', function (worker) {
        console.log(('Cluster : Worker PID#' + worker.process.pid + ' is online').green);
      });

      cluster.on('exit', function (worker, code, signal) {
        var exitCode = worker.process.exitCode;
        console.log(('Cluster : Worker #' + worker.process.pid + ' died (' + exitCode + ')! Trying to respaw...').red);
        cluster.fork();
      });
      this.startBackGround(); // the master process is ran as background application and do not listens to port
      return true;
    } else {
      this.startBackGround();
      return false;
    }
  };

  this.startCluster = function (numberOfWebServers, numberOfBackGround) {
    throw new Error('Not implemented yet!');
  };
}

/**
 * @method Hunt#on
 * @param {string} eventName
 * @param {function} listener
 * @returns {Hunt}
 * @description
 * Adds a listener to the end of the listeners array for the specified event.
 * Calls can be chained.
 * Hunt object is a {@link http://nodejs.org/docs/latest/api/events.html | standart nodejs event emmiter object }, so it supports all event emitter methods.
 * @example
 * ```javascript
 *    Hunt.on('start', function (params) {
 *      console.log('Hunt is started as '+params.type+' on port '+params.port);
 *    }).on('httpError', console.error);
 * ```
 */

/**
 * @method Hunt#once
 * @param {string} eventName
 * @param {function} listener
 * @returns {Hunt}
 * @description
 * Adds a one time listener for the event. This listener is invoked only the next time the event is fired, after which it is removed.
 * Calls can be chained.
 * Hunt object is a {@link http://nodejs.org/docs/latest/api/events.html | standart nodejs event emmiter object }, so it supports all event emitter methods.
 * @see Hunt#on
 */

/**
 * @method Hunt#removeListener
 * @param {string} eventName
 * @param {function} listener
 * @returns {Hunt} Hunt
 * @description
 * Hunt object is a {@link http://nodejs.org/docs/latest/api/events.html | standart nodejs event emmiter object }, so it supports all event emitter methods.
 * Remove a listener from the listener array for the specified event.
 * Caution: changes array indices in the listener array behind the listener.
 * Calls can be chained.
 */

/**
 * @method Hunt#emit
 * @param {string} eventName
 * @param {object} payload
 * @description
 * Makes Hunt emit an event. Returns true if event had listeners, false otherwise.
 * Hunt object is a {@link http://nodejs.org/docs/latest/api/events.html | standart nodejs event emmiter object }, so it supports all event emitter methods.
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
  * @module Hunt
  * @class Hunt
  * @classdesc
  * Main object, that have everything that we need in it.
  * @constructs Hunt
  * @param {config} config - key-value object with settings
  * @see config
  * @fires Hunt#start
  * @fires Hunt#httpError
  * @fires Hunt#httpSuccess
  * @fires Hunt#notify
  * @fires Hunt#notify:all
  * @fires Hunt#notify:email
  * @fires Hunt#notify:sio
  * @fires Hunt#user:save
  * @fires Hunt#broadcast
  */
module.exports = exports = function (config) {
  return new Hunt(config);
};


/**
 * @class config
 * @classdesc
 * Configuration object, that is passed to Hunt constructor
 *
 * @property {string} hostUrl - url to host of current application,
 * used in oAuth authentication strategies and for building redirects.
 * For example - http://example.org/
 *
 * @property {string} env - application environment, if not set, populated
 * from enviromental value of NODE_ENV. Default is `development`, the values
 * of `staging` and `production` can be used
 *
 * @property {number} port - port for webserver process(es) to bind to.
 * Note: on *nix machines ports with number bellow 1000 are only bindable
 * by applicaiton ran as root user.
 *
 * @property {boolean} enableMongoose - enable mongo database support,
 * default is true - enabled

 * @property {string} templateEngine - template engine to use,
 * default is {@link https://github.com/vol4ok/hogan-express | hogan-express}
 * - {@link http://mustache.github.io/ | mustache} based template engine with layouts,
 * partials and locals,
 * other options are {@link http://paularmstrong.github.io/swig/ | swig},
 * ejs and jade (under construction).

 * @property {boolean} enableMongoose - enable mongo support via mongoose orm, default is true - enabled
 * @property {string} mongoUrl - connection string for mongoose ORM,
 * default is 'mongodb://localhost/hunt_dev'.
 * It can be automatically populated from enviromental values of `MONGO_URL`,
 * `MONGOSOUP_URL`,`MONGOHQ_URL`,`MONGOLAB_URL`.
 * Connection string has this {@link http://docs.mongodb.org/manual/reference/connection-string/ syntax }

 * @property {boolean} enableMongooseUsers - enable mongo based user object,
 * default is true - enabled

 * @property {string} redisUrl - connection string for redis, default is
 * 'redis://localhost:6379', can be populated from enviromental variables
 * of 'REDISTOGO_URL', 'OPENREDIS_URL', 'REDISCLOUD_URL',
 *  'REDISGREEN_URL', 'REDIS_URL'
 *
 * @property {string} public - directory for assets - css, images,
 * client side javascripts, that are served by {@link http://www.senchalabs.org/connect/static.html | connect static middleware}
 * for example, 'public': __dirname+'/public'
 *
 * @property {string} views - directory for templates, used by template
 * engine for rendering static HTML pages on server side.
 * {@link http://expressjs.com/api.html#app-settings}
 *
 * @property {string} emailConfig - configuration string for {@link https://npmjs.org/package/nodemailer/ | email delivery system },
 * used for notify users.
 * When left blank, the direct transport is used - it is quite slow, and the emails
 * are usually marked as spam.
 * Examples:
 * 'nodemailer://somebody@gmail.com:somepassword@gmail',
 * 'nodemailer://postmaster@teksi.ru:7tu8z3zsaa421@Mailgun',
 *
 * @property {Boolean} dialog - enable dialog REST-api for private messages
 * @property {Boolean} huntKey - enable authorization huntKey as GET, POST, header, default is false - disabled
 * @property {Boolean} disableCsrf - disable csrf protection, default is false - CSRF protection is enabled
 *
 * @property {number} maxWorkers - limit the number of webserver/background processes cluster spawns. Default - 1 per CPU core.
 *
 * @property {passport} passport - {@link http://passportjs.org | passport.js}
 * configuration object, used for setting the methods users authorize,
 *
 * @property {boolean} uploadFiles -  allow upload of files by HTTP-POST,
 * {@link http://expressjs.com/api.html#req.files},
 * default is false, disabled, and for a good cause {@link https://groups.google.com/forum/#!topic/nodejs/6KOlfk5cpcM}
 *
 * @property {object} io - configuration options for {@link http://socket.io/}
 * @property {string} favicon - path to favicon
 * @property {string} secret - string to preseed session hashes and do other security related things
 */


/**
 * @class model
 * @classdesc
 * Class to hold data models of Hunt application, they are injected into
 * request object. This models can be loaded by
 * {@link Hunt#extendModel} function as mongoose or sequilize
 * active record objects
 * @property {Group} Group - {@link Group} of users
 * @property {Group} Groups - synonim for {@link Group}
 * @property {Group} group - synonim for {@link Group}
 * @property {Group} groups - synonim for {@link Group}

 * @property {User} Users - class, that represents site/application user
 * @property {User} User - synonim for {@link User}
 * @property {User} user - synonim for {@link User}
 * @property {User} users - synonim for {@link User}
 * @property {GroupMessage} GroupMessage - Class for messages send by users to groups
 * @property {Message} Message - Class for messages send by users to groups
 * @see Hunt#extentModel
 */