'use strict';
require('colors');


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
 *
 * @property {boolean} steam - authorization by Steam openId - default is false - disabled.
 *
 * @property {number} sessionExpireAfterSeconds - time to live of cookie based http sessions, default is 180 seconds.
 *
 * @property {string} GOOGLE_CLIENT_KEY - used to authorize users by {@link https://developers.google.com/accounts/docs/OAuth2 | Google OAuth 2.0 strategy}, obtainable in {@link https://console.developers.google.com/ Google Developers' console }
 * @property {string} GOOGLE_CLIENT_SECRET  - used to authorize users by {@link https://developers.google.com/accounts/docs/OAuth2 | Google OAuth 2.0 strategy}, obtainable in {@link https://console.developers.google.com/ Google Developers' console }
 * @property {Array.<string>} GOOGLE_SCOPES - OAuth 2.0 scopes required by application - see {@link https://developers.google.com/+/api/oauth#login-scopes}. Default value is `['https://www.googleapis.com/auth/userinfo.profile','https://www.googleapis.com/auth/userinfo.email']`
 *
 * @property {string} GITHUB_CLIENT_ID - used for github oauth, is populated automatically from enviroment value of the same name, obtainable here {@link https://github.com/settings/applications}
 * @property {string} GITHUB_CLIENT_SECRET - used for github oauth, is populated automatically from enviroment value of the same name, obtainable here {@link https://github.com/settings/applications}
 *
 * @property {string} TWITTER_CONSUMER_KEY - used for twitter oauth, is populated automatically from enviroment value of the same name, obtainable here {@link https://dev.twitter.com/}
 * @property {string} TWITTER_CONSUMER_SECRET  - used for twitter oauth, is populated automatically from enviroment value of the same name, obtainable here {@link https://dev.twitter.com/}
 *
 * @property {string} VK_APP_ID - used for vk.com oauth, is populated automatically from enviroment value of the same name, obtainable here {@link https://vk.com/dev}
 * @property {string} VK_APP_SECRET - used for vk.com oauth, is populated automatically from enviroment value of the same name, obtainable here {@link https://vk.com/dev}
 * @property {Array.<string>} VK_SCOPE - array of scopes, that are required from user to share with application - used in vk.com authorization strategy
 *
 * @property {string} FACEBOOK_CLIENT_ID  - used for facebook.com oauth, is populated automatically from enviroment value of the same name, obtainable here {@link https://developers.facebook.com/}
 * @property {string} FACEBOOK_CLIENT_SECRET - used for facebook.com oauth, is populated automatically from enviroment value of the same name, obtainable here {@link https://developers.facebook.com/}
 */


module.exports = exports = function (core, router) {
  var
    strategies = [],
    routes = [];
//Storing user in session, storage key is huntKey
  core.passport.serializeUser(function (user, done) {
    done(null, user.huntKey);
  });

//retrieving user from session
  core.passport.deserializeUser(function (huntKey, done) {
    core.model.User.findOneByHuntKey(huntKey, done);
  });

//loading local strategy
  if (core.config.passport.local === true) {
    strategies.push(require('./../passportStrategies/local.js'));
    console.log('PassportManager:'.green + ' local strategy enabled!');
    if (core.config.passport.verifyEmail) {
      console.log('PassportManager:'.green + ' email verification enabled!');
    }
  }

//openid strategies
  [
    'steam'
//    'yahoo', 'intuit', 'paypal' - doesn't works with passportjs 0.3.x!
  ]
    .map(function (strategyName) {
      if (core.config.passport[strategyName] === true) {
        strategies.push(require('./../passportStrategies/' + strategyName + '.openid.js'));
        console.log('PassportManager:'.green + ' ' + strategyName.toUpperCase() + ' OpenID authorization enabled!');
      }
    });

//oauth strategies
  if (core.config.passport.GOOGLE_CLIENT_ID && core.config.passport.GOOGLE_CLIENT_SECRET) {
    strategies.push(require('./../passportStrategies/google.oauth2.js'));
    console.log('PassportManager:'.green + ' Google OAuth 2.0 authorization enabled!');
  }

  if (core.config.passport.GITHUB_CLIENT_ID && core.config.passport.GITHUB_CLIENT_SECRET) {
    strategies.push(require('./../passportStrategies/github.js'));
    console.log('PassportManager:'.green + ' Github authorization enabled!');
  }

  if (core.config.passport.TWITTER_CONSUMER_KEY && core.config.passport.TWITTER_CONSUMER_SECRET) {
    strategies.push(require('./../passportStrategies/twitter.js'));
    console.log('PassportManager:'.green + ' Twitter authorization enabled!');
  }

  if (core.config.passport.VK_APP_ID && core.config.passport.VK_APP_SECRET) {
    strategies.push(require('./../passportStrategies/vkcom.js'));
    console.log('PassportManager:'.green + ' VK authorization enabled!');
  }

  if (core.config.passport.FACEBOOK_CLIENT_ID && core.config.passport.FACEBOOK_CLIENT_SECRET) {
    strategies.push(require('./../passportStrategies/facebook.js'));
    console.log('PassportManager:'.green + ' Facebook authorization enabled!');
  }

//initializing strategies defined by Hunt.extendStrategy
  strategies.map(function (strategy) {
    core.passport.use(strategy.strategy(core));
    routes.push(strategy.routes);
  });
//adding some always working routes for authorization
//they can be overloaded in application by Hunt.extendRoutes(function(core){});
  router.get('/success', function (req, res) {
    if (req.user) {
      req.flash('success', 'Welcome to our site, ' + req.user.displayName + '!');
    }
    res.redirect('/');
  });

  router.get('/failure', function (req, res) {
    if (!req.user) {
      req.flash('error', 'Authorization failed!');
    }
    res.redirect('/');
  });

  router.all('/logout', function (req, res) {
    if (req.user) {
      req.flash('success', 'Goodbye, ' + req.user.displayName + '!');
    }
    req.logout();
    res.redirect(req.headers.referer || '/');
  });

  routes.map(function (r) {
    r(core, router);
  });
};

