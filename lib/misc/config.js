'use strict';

/**
 * @class config
 * @classdesc
 * Configuration object, that is passed to Hunt constructor
 *
 * @property {string} hostUrl - url to host of current application,
 * used in oAuth authentication strategies and for building redirects.
 * Populated from environment variable of HOST_URL.
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
 * @property {(string|null)} address - what address to bind to.
 * Default is '0.0.0.0' - all IPv4 addresses.
 * The address is populated from environment address of HUNTJS_ADDR.
 * HuntJS supports both IPv4 and IPv6 addresses as described
 * {@link http://code.danyork.com/2011/01/21/how-to-use-node-js-with-ipv6/ here}.
 *
 * @property {boolean} enableMongoose - enable mongo support via mongoose orm, default is true - enabled
 * @property {string} mongoUrl - connection string for mongoose ORM,
 * default is 'mongodb://localhost/hunt_dev'.
 * It can be automatically populated from enviromental values of `MONGO_URL`,
 * `MONGOSOUP_URL`,`MONGOHQ_URL`,`MONGOLAB_URL`.
 * Connection string has this {@link http://docs.mongodb.org/manual/reference/connection-string/ syntax }
 *
 * @property {boolean} enableMongooseUsers - enable mongodb based user object, build by pattern of Active Record.
 * Default is true - enabled
 *
 * @property {string} redisUrl - connection string for redis, default is
 * 'redis://localhost:6379', can be populated from enviromental variables
 * of 'REDISTOGO_URL', 'OPENREDIS_URL', 'REDISCLOUD_URL',
 *  'REDISGREEN_URL', 'REDIS_URL'
 *
 * @property {string} sequelizeUrl - URI for relational database connection. Is used in {@link https://www.npmjs.org/package/hunt-sequilize | Hunt-sequilize} plugin
 *
 * @property {string} public - directory for assets - css, images,
 * client side javascripts, that are served by {@link http://www.senchalabs.org/connect/static.html | connect static middleware}
 * for example, 'public': __dirname+'/public'
 *
 * @property {string} views - directory for {@link http://expressjs.com/api.html#app-settings | templates},
 * used by template engine for rendering static HTML pages on server side.
 * See this {@link https://huntjs.herokuapp.com/documentation/tutorial-templating.html | tutorial} for details
 *
 * @property {string} emailConfig - configuration string for {@link https://npmjs.org/package/nodemailer/ | email delivery system },
 * used for notify users.
 * When left blank, the direct transport is used - it is quite slow, and the emails
 * are usually marked as spam.
 * Also you can set up SMTP options directly like mentioned here {@link https://github.com/andris9/nodemailer#setting-up-smtp }
 * Examples:
 * 'nodemailer://somebody@gmail.com:somepassword@gmail',
 * 'nodemailer://postmaster@teksi.ru:7tu8z3zsaa421@Mailgun',
 *
 * @property {Boolean} usersApi - enable REST-api for editing user profiles
 *
 * @property {Boolean} dialog - enable dialog REST-api for private messages
 * @property {Boolean} huntKey - enable authorization by huntKey as GET query, or POST/PUT/DELETE body parameter. Default is false - disabled
 * @property {Boolean} huntKeyHeader - enable authorization by huntKey as custom header, default is false - disabled
 *
 * @property {Boolean} disableCsrf - disable csrf protection, default is false - CSRF protection is enabled. See {@link https://www.npmjs.org/package/csurf } for details. Also this works from the box with AngularJS $resourse and $http
 *
 * @property {String} adminEmail - email address of server administrator. If present, every error will be reported to this email with plenty of additional information and error stack.
 *
 * @property {number} maxWorkers - limit the number of webserver/background processes cluster spawns. Default - 1 per CPU core.
 *
 * @property {passport} passport - {@link http://passportjs.org | passport.js}
 * configuration object, used for setting the methods users authorize,
 * @property {String} bodyParserLimit - limit the size of request body.
 * See {@link https://www.npmjs.com/package/body-parser#limit | body-parser } documentation
 * for detauls. Default is '100kb'
 *
 * @property {boolean} uploadFiles -  allow upload of files by HTTP-POST,
 * {@link http://expressjs.com/api.html#req.files},
 * default is false, disabled, and for a good cause {@link https://groups.google.com/forum/#!topic/nodejs/6KOlfk5cpcM}
 *
 * @property {object} io - configuration options for {@link http://socket.io/}. Default is `{'enabled':false}`, make `{'enabled':true} to enable. We can use this parameters for setup - {@link https://github.com/Automattic/engine.io#methods-1}. If we pass `true`, the sane default values will be set.
 * @property {string} favicon - path to favicon
 * @property {string} secret - string to preseed session hashes and do other security related things
 * @property {object} telnetServer - configuration options for RAI telnet server {@link https://github.com/andris9/rai#starting-a-server}
 */

var
  winston = require('winston'),
  os = require('os'),
  rack = require('./rack.js'),
  url = require('url');


module.exports = exports = function (configToUse) {
  var
    numCPUs,
    hostname,
    parsedRedis,
    parsedMongo,
    parsedHostUrl,
    config = configToUse || {};
  config.env = config.env || process.env.NODE_ENV || 'development';
  config.port = config.port || parseInt(process.env.PORT, 10) || 3000;
  config.secret = config.secret || process.env.SECRET || null;
  config.adminEmail = config.adminEmail || process.env.ADMIN_EMAIL || null;
  config.address = config.address || process.env.HUNTJS_ADDR || '0.0.0.0';

  if (!config.adminEmail) {
    winston.warn('ConfigManager: config.adminEmail is missing! Set the config parameter of adminEmail or environment value of ADMIN_EMAIL to be able to recieve email reports with errors!');
  }
  if (!config.secret) {
    winston.warn('ConfigManager: config.secret is missing! Generating the secret on the fly...');
    config.secret = rack();
  }

  if (config.hostUrl) {
    winston.silly('ConfigManager: hostUrl is set to %s', config.hostUrl);
  }

  if (!config.hostUrl) {
    if (process.env.HOST_URL) {
      config.hostUrl = process.env.HOST_URL;
    } else {
      hostname = os.hostname();
      if (config.env === 'development') {
        hostname = 'localhost';
      }
      config.hostUrl = 'http://' + hostname + ':' + config.port + '/';
    }
    winston.warn('ConfigManager: assuming hostUrl is %s', config.hostUrl);
  }

//trying to setup mail dispatcher
  if (!config.emailConfig) {
    config.emailConfig = process.env.emailConfig;
  }

  if (!config.favicon) {
    /*jslint nomen: false */
    /*jshint nomen: false */
    config.favicon = __dirname + '/favicon.ico';
    /*jslint nomen: true */
    /*jshint nomen: true */
  }

//trying to get redis connection parameters
  if (config.redisUrl) {
    winston.silly('ConfigManager: REDIS extracted connection parameters from config object!');
  } else {
    [
      'REDISTOGO_URL',//https://devcenter.heroku.com/articles/redistogo#using-with-node-js
      'OPENREDIS_URL',//https://devcenter.heroku.com/articles/openredis#using-redis-from-node-js
      'REDISCLOUD_URL', //https://devcenter.heroku.com/articles/heroku-redis#connecting-in-node-js
      'REDISGREEN_URL', //https://devcenter.heroku.com/articles/redisgreen#using-redis-with-node-js
      'REDIS_URL' //https://devcenter.heroku.com/articles/heroku-redis#connecting-in-node-js
    ]
      .map(function (redisKey) {
        if (process.env[redisKey]) {
          winston.silly('ConfigManager: REDIS extracted connection parameters from process.env.%s', redisKey);
          config.redisUrl = process.env[redisKey];
        }
      });
    if (!config.redisUrl) {
      config.redisUrl = 'redis://localhost:6379';
      winston.warn('ConfigManager: REDIS used default redis connection parameters - redis://localhost:6379');
    }
  }

//autoloading mongoose ORM and mongoose users model
  if (config.enableMongoose === undefined) {
    config.enableMongoose = true;
  }
  if (config.enableMongoose && config.enableMongooseUsers === undefined) {
    config.enableMongooseUsers = true;
  }

  if (config.mongoUrl) {
    winston.silly('ConfigManager: MONGO extracted connection parameters from config object!');
  }

  if (config.enableMongoose && !config.mongoUrl) {
    [
      'MONGODB_URI', //https://devcenter.heroku.com/articles/mongolab#getting-your-connection-uri
      'MONGOLAB_URI', //https://devcenter.heroku.com/articles/mongolab#getting-your-connection-uri
      'MONGOHQ_URL', //https://devcenter.heroku.com/articles/mongohq#use-with-ruby
      'MONGO_URL'
    ]
      .map(function (mongoKey) {
        if (process.env[mongoKey]) {
          winston.silly('ConfigManager: MONGO extracted connection parameters from process.env.%s!', mongoKey);
          config.mongoUrl = process.env[mongoKey];
        }
      });

    if (!config.mongoUrl) {
      winston.warn('ConfigManager: MONGO used default connection settings  - mongodb://localhost/hunt_dev');
      config.mongoUrl = 'mongodb://localhost:27017/hunt_dev';
    }
  }
//sequilize setup

  if (config.sequelizeUrl) {
    winston.silly('ConfigManager: SQL extracted connection parameters from config object');
  }

  [
    'DATABASE_URL', //heroku postgress
    'CLEARDB_DATABASE_URL', //cleardb mysql
    'SQL_URL' //something user provided
  ]
    .map(function (sqlProviderName) {
      if (process.env[sqlProviderName] && !config.sequelizeUrl) {
        config.sequelizeUrl = process.env[sqlProviderName];
        winston.silly('ConfigManager: SQL extracted connection parameters from process.env.%s!', sqlProviderName);
      }
    });

//setting socket.io parameters
//with same sane values
// see for details - https://github.com/Automattic/engine.io#methods-1
  if (config.io === true) {
    config.io = {
      'enabled': true,
      'pingTimeout': 5000,
      'pingInterval': 10000,
      'allowUpgrades': true,
      'transports': ['polling', 'websocket']
    };
  }

//setting authorization strategies parameters
  config.passport = config.passport || {};
  config.passport.sessionExpireAfterSeconds = config.passport.sessionExpireAfterSeconds || 180;
  config.passport.local = (config.passport.local === undefined) ? true : config.passport.local;

  if (config.passport.local) {

    config.passport.signUpByEmail = config.passport.signUpByEmail || false;
    if (config.passport.signUpByEmail) {
      config.passport.verifyEmail = config.passport.verifyEmail || false;
      if (config.passport.verifyEmail && !config.passport.verifyEmailTemplate) {
        throw new Error('Error setting template for email used for verifying user\'s account!');
      }
    }
    config.passport.resetPassword = config.passport.resetPassword || false;
    if (config.passport.resetPassword && !config.passport.resetPasswordEmailTemplate) {
      throw new Error('Error setting template for email used for reseting password for user\'s account!');
    }
  }

//disable by default OpenID strategies
//we do not use population from environment, because they have
//simple ON/OFF settings
  config.passport.steam = config.passport.steam || false;


//getting oauth strategies settings from application environment
  [
    'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
    'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET',
    'TWITTER_CONSUMER_KEY', 'TWITTER_CONSUMER_SECRET',
    'FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET',
    'VK_APP_ID', 'VK_APP_SECRET'
  ]
    .map(function (a) {
      config.passport[a] = config.passport[a] || process.env[a] || null;
    });


//scaling
  numCPUs = os.cpus().length;
  config.maxWorkers = Math.min(numCPUs, config.maxWorkers || 16);

//setting default template engine
  config.templateEngine = config.templateEngine || 'hogan';

//making config for telnet server
  config.telnetServer = config.telnetServer || {};


//sanity checks
  parsedRedis = url.parse(config.redisUrl);
  if (!parsedRedis || parsedRedis.protocol !== 'redis:') {
    throw new Error('Wrong redisUrl in config!');
  }

  if (config.mongoUrl) {
    parsedMongo = url.parse(config.mongoUrl);
    if (!parsedMongo || parsedMongo.protocol !== 'mongodb:') {
      throw new Error('Wrong mongoUrl in config!');
    }
  }

  parsedHostUrl = url.parse(config.hostUrl);
  if (!parsedHostUrl || !(parsedHostUrl.protocol === 'http:' || parsedHostUrl.protocol === 'https:')) {
    throw new Error('Wrong hostUrl in config!');
  }

  if (config.secret.length < 9) {
    throw new Error('Config.secret is to short!');
  }

  return config;
};
