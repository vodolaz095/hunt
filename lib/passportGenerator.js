'use strict';
require('colors');

/**
 * @class HTTPAuthorizationAPI
 * @classdesc
 * HTTP requests used for authorization with cookie based sessions.
 * The {@link http://passport.js} and {@link http://www.senchalabs.org/connect/}
 * is used. The authorization api is mainly configured by
 * {@link passport} config object
 */

module.exports = exports = function (core, strategies, routes) {

//Storing user in session, storage key is apiKey
  core.passport.serializeUser(function (user, done) {
    done(null, user.apiKey);
  });

//retrieving user from session
  core.passport.deserializeUser(function (apiKey, done) {
    core.model.User.findOne({apiKey: apiKey}, done);
  });

  if (core.config.passport.local) {
    strategies.push(require('./passportStrategies/local.js'));
    console.log('PassportManager:'.green + ' local strategy enabled!');
    if (core.config.passport.verifyEmail) {
      strategies.push(require('./passportStrategies/hash.js'));
      console.log('PassportManager:'.green + ' email verification enabled!');
    }
  }

  if (core.config.passport.google) {
    strategies.push(require('./passportStrategies/google.js'));
    console.log('PassportManager:'.green + ' gmail authorization enabled!');
  }

  if (core.config.passport.GITHUB_CLIENT_ID && core.config.passport.GITHUB_CLIENT_SECRET) {
    strategies.push(require('./passportStrategies/github.js'));
    console.log('PassportManager:'.green + ' Github authorization enabled!');
  }

  if (core.config.passport.TWITTER_CONSUMER_KEY && core.config.passport.TWITTER_CONSUMER_SECRET) {
    strategies.push(require('./passportStrategies/twitter.js'));
    console.log('PassportManager:'.green + ' Twitter authorization enabled!');
  }

  if (core.config.passport.VK_APP_ID && core.config.passport.VK_APP_SECRET) {
    strategies.push(require('./passportStrategies/vkcom.js'));
    console.log('PassportManager:'.green + ' VK authorization enabled!');
  }

  if (core.config.passport.FACEBOOK_CLIENT_ID && core.config.passport.FACEBOOK_CLIENT_SECRET) {
    strategies.push(require('./passportStrategies/facebook.js'));
    console.log('PassportManager:'.green + ' Facebook authorization enabled!');
  }

//initializing strategies defined by Hunt.extendStrategy
  strategies.map(function (strategy) {
    core.passport.use(strategy.strategy(core));
    routes.push(strategy.routes);
  });

//adding some always working routes for authorization
//they can be overlaped in application by Hunt.extendRoutes(function(core){});
  routes.push(function (core) {
/**
 * @method HTTPAuthorizationAPI#GET /auth/success
 * @description
 * Route, where user is redirected after successeful authorization
 * by any default passport.js strategies. This routes adds flash message
 * of `success` to {@link response} locals.flash.success and makes a 302
 * redirect on /.
 * This route can be redefined by {@link Hunt#extendRoutes}
 */

    core.app.get('/auth/success', function (req, res) {
      if (req.user) {
        req.flash('success', 'Welcome to our site, ' + req.user.displayName + '!');
      }
      res.redirect('/');
    });

/**
 * @method HTTPAuthorizationAPI#GET /auth/failure
 * @description
 * Route, where user is redirected after unsuccesseful authorization
 * by any default passport.js strategies. This routes adds flash message
 * of `error` to {@link response} locals.flash.error and makes a 302
 * redirect on /.
 * This route can be redefined by {@link Hunt#extendRoutes}
 */
    core.app.get('/auth/failure', function (req, res) {
      if (!req.user) {
        req.flash('error', 'Authorization failed!');
      }
      res.redirect('/');
    });

/**
 * @method HTTPAuthorizationAPI#GET /auth/logout
 * @description
 * Clears current user session, that results in logout and redirect
 * to /
 */

/**
 * @method HTTPAuthorizationAPI#POST /auth/logout
 * @param {string} _csrf - csrf protection token, if config option is enabled
 * @see config
 * @description
 * Clears current user session, that results in logout and redirect
 * to /
 */

    core.app.all('/auth/logout', function (req, res) {
      req.logout();
      res.redirect(req.headers.referer || '/');
    });
  });
};

/**
 * @class passport
 * @extends config
 * @classdesc
 * Object that hold the passport.js configuration parameters
 *
 * @property {boolean} local - enable local strategy
 * @property {boolean} signUpByEmail - user can signup by making POST /auth/signup with email and password, default is true, requires local strategy
 * @property {boolean} verifyEmail - user have to follow link in email address to verify his account, default is true
 * @property {string} verifyEmailTemplate - path to template for verifying email template
 * @property {boolean} resetPassword - allow user to reset password for account, default is true
 * @property {string} resetPasswordEmailTemplate - template for email used for reseting password
 * @property {string} resetPasswordPageTemplate - template for page used for reseting password
 * @property {boolean} google - authorization by google openId - default is false - disabled.
 * @property {number} sessionExpireAfterSeconds - time to live of cookie based http sessions, default is 180 seconds.
 *
 * @property {string} GITHUB_CLIENT_ID - used for github oauth, is populated automatically from enviroment value of the same name, obtainable here {@link https://github.com/settings/applications}
 * @property {string} GITHUB_CLIENT_SECRET - used for github oauth, is populated automatically from enviroment value of the same name, obtainable here {@link https://github.com/settings/applications}
 * @property {string} TWITTER_CONSUMER_KEY - used for twitter oauth, is populated automatically from enviroment value of the same name, obtainable here {@link https://dev.twitter.com/}
 * @property {string} TWITTER_CONSUMER_SECRET  - used for twitter oauth, is populated automatically from enviroment value of the same name, obtainable here {@link https://dev.twitter.com/}
 * @property {string} VK_APP_ID - used for vk.com oauth, is populated automatically from enviroment value of the same name, obtainable here {@link https://vk.com/dev}
 * @property {string} VK_APP_SECRET - used for vk.com oauth, is populated automatically from enviroment value of the same name, obtainable here {@link https://vk.com/dev}
 * @property {Array.<string>} VK_SCOPE - array of scopes, that are required from user to share with application - used in vk.com authorization strategy
 * @property {string} FACEBOOK_CLIENT_ID  - used for facebook.com oauth, is populated automatically from enviroment value of the same name, obtainable here {@link https://developers.facebook.com/}
 * @property {string} FACEBOOK_CLIENT_SECRET - used for facebook.com oauth, is populated automatically from enviroment value of the same name, obtainable here {@link https://developers.facebook.com/}
 */
