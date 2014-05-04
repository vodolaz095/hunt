'use strict';

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
 * @property {String} adminEmail - email address of server administrator. If present, every error will be reported to this email with plenty of additional information and error stack.
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
 * @property {object} telnetServer - configuration options for RAI telnet server {@link https://github.com/andris9/rai#starting-a-server}
 */

require('colors');
var os = require('os'),
  crypto = require('crypto'),
  url = require('url');

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex').toString();
}

module.exports = exports = function (configToUse) {
  var config = configToUse || {};
  config.env = config.env || process.env.NODE_ENV || 'development';
  config.port = config.port || process.env.PORT || 3000;
  config.secret = config.secret || process.env.secret || null;
  config.adminEmail = config.adminEmail || process.env.ADMIN_EMAIL || null;

  if(!config.adminEmail) {
    console.error(('ConfigManager: config.adminEmail is missing! Set the config parameter of adminEmail or environment value of ADMIN_EMAIL to be able to recieve email reports with errors!').yellow)
  }
  if (!config.secret) {
    console.error(('ConfigManager: config.secret is missing! Generating the secret on the fly...').yellow);
    config.secret = (md5(JSON.stringify(os)));
  }

  if(config.hostUrl) {
    console.log(('ConfigManager: hostUrl is set to ' + config.hostUrl).green);
  }

  if (!config.hostUrl) {
    if (process.env.hostUrl) {
      config.hostUrl = process.env.hostUrl;
    } else {
      var hostname = os.hostname();
      if (config.env === 'development') {
        hostname = 'localhost';
      }
      config.hostUrl = 'http://' + hostname + ':' + config.port + '/';
    }
    console.log(('ConfigManager: assuming hostUrl is ' + config.hostUrl).yellow);
  }

//trying to setup mail dispatcher
  if (!config.emailConfig) {
    config.emailConfig = process.env.emailConfig;
  }

  if(!config.favicon) {
    config.favicon = __dirname+'/favicon.ico';
  }

//trying to get redis connection parameters
  if(config.redisUrl){
    console.log('ConfigManager: REDIS'.green + ' extracted connection parameters from config object!');
  } else {
    [
      'REDISTOGO_URL',
      'OPENREDIS_URL',
      'REDISCLOUD_URL',
      'REDISGREEN_URL',
      'REDIS_URL'
    ].map(function (redisKey) {
        if (process.env[redisKey]) {
          console.log('ConfigManager: REDIS'.green + ' extracted connection parameters from process.env.' + redisKey + ' !');
          config.redisUrl = process.env[redisKey];
        }
      });
    if (!config.redisUrl) {
      config.redisUrl = 'redis://localhost:6379';
      console.log('ConfigManager: REDIS'.yellow + ' used default redis connection parameters - redis://localhost:6379');
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
    console.log('ConfigManager:MONGO'.green + ' extracted connection parameters from config object!');
  }

  if (config.enableMongoose && !config.mongoUrl) {
    [
      'MONGOLAB_URI',
      'MONGOSOUP_URL',
      'MONGOHQ_URL',
      'MONGO_URL'
    ].map(function (mongoKey) {
        if(process.env[mongoKey]){
        console.log('ConfigManager: MONGO'.green + ' extracted connection parameters from process.env.' +
          mongoKey + ' !');
        config.mongoUrl = process.env[mongoKey];
      }
    });

    if(!config.mongoUrl){
      console.log('ConfigManager: MONGO'.yellow + ' used default connection settings  - mongodb://localhost/hunt_dev');
      config.mongoUrl = 'mongodb://localhost/hunt_dev';
    }
  }
//sequilize setup

  if (config.sequelizeUrl) {
    console.log('ConfigManager: Sequilize'.green + ' extracted connection parameters from config object');
  }

  [
    'DATABASE_URL', //heroku postgress
    'CLEARDB_DATABASE_URL', //cleardb mysql
    'SQL_URL' //something user provided
  ].map(function (sqlProviderName) {
      if (process.env[sqlProviderName] && !config.sequelizeUrl) {
        config.sequelizeUrl = process.env[sqlProviderName];
        console.log('ConfigManager: Sequilize'.green + ' extracted connection parameters from process.env.' + sqlProviderName + ' !');
      }
    });


//setting authorization strategies parameters
  config.passport = config.passport || {};
  config.passport.sessionExpireAfterSeconds = config.passport.sessionExpireAfterSeconds || 180;
  config.passport.local = (config.passport.local === undefined) || true;

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
// simple ON/OFF settings
  config.passport.google = config.passport.google || false;
  config.passport.yahoo = config.passport.yahoo || false;
  config.passport.steam = config.passport.steam || false;
  config.passport.paypal = config.passport.paypal || false;
  config.passport.intuit = config.passport.intuit || false;


//getting oauth strategies settings from application environment
  [
    'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET',
    'TWITTER_CONSUMER_KEY', 'TWITTER_CONSUMER_SECRET',
    'FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET',
    'LINKEDIN_API_KEY', 'LINKEDIN_SECRET_KEY',
    'VK_APP_ID', 'VK_APP_SECRET'
  ].map(function (a) {
      config.passport[a] = config.passport[a] || process.env[a] || null;
    });


//scaling
  var numCPUs = os.cpus().length;
  config.maxWorkers = Math.min(numCPUs, config.maxWorkers || 16);

//setting default template engine
  config.templateEngine = config.templateEngine || 'hogan';

//making config for telnet server
  config.telnetServer = config.telnetServer || {}


//sanity checks
  var parsedRedis = url.parse(config.redisUrl);
  if (!parsedRedis || parsedRedis.protocol !== 'redis:') {
    throw new Error('Wrong redisUrl in config!');
  }

  if(config.mongoUrl){
    var parsedMongo = url.parse(config.mongoUrl);
    if (!parsedMongo || parsedMongo.protocol !== 'mongodb:') {
      throw new Error('Wrong mongoUrl in config!');
    }
  }

  var parsedHostUrl = url.parse(config.hostUrl);
  if (!parsedHostUrl || !(parsedHostUrl.protocol === 'http:' || parsedHostUrl.protocol === 'https:')) {
    throw new Error('Wrong hostUrl in config!');
  }

  if (config.secret.length < 9) {
    throw new Error('Config.secret is to short!');
  }

  return config;
};
