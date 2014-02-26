'use strict';

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

  if(process.env.secret){
    config.secret = process.env.secret;
  }
  if (!config.secret) {
    console.error(('ConfigManager: secret - config.secret is missing! Generating the secret on the fly...').yellow);
    config.secret = (md5(JSON.stringify(os)));
  }

  if(config.hostUrl) {
    console.log(('ConfigManager: hostUrl is set to ' + config.hostUrl).green);
  }

  if (!config.hostUrl) {
    if (process.env.hostUrl) {
      config.hostUrl = process.env.hostUrl;
    }

    var hostname = os.hostname();
    if (config.env === 'development') {
      hostname = 'localhost';
    }
    config.hostUrl = 'http://' + hostname + ':' + config.port + '/';
    console.log(('ConfigManager: assuming hostUrl is ' + config.hostUrl).yellow);
  }

//trying to setup mail dispatcher
  if (!config.emailConfig) {
    config.emailConfig = process.env.emailConfig || null;
  }

//trying to get redis connection parameters
  if(config.redisUrl){
    console.log('ConfigManager: REDIS'.green + ' extracted connection parameters from config object!');
  }

  if (!config.redisUrl) {
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

  config.passport.google = config.passport.google || false;

//getting oauth strategies settings from application enviroment
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

//todo - check for SQL connection string

  if (config.secret.length < 9) {
    throw new Error('Config.secret is to short!');
  }

  return config;
};
