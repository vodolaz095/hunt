'use strict';
require('colors');

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
      strategies.push(require('./../passportStrategies/hash.js'));
      console.log('PassportManager:'.green + ' email verification enabled!');
    }
  }

//openid strategies
  [
    'yahoo', 'steam',
    'intuit', 'paypal'
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
    console.log('Binding router', r);
    r(core, router);
  });
};

