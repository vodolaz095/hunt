'use strict';

var YahooStrategy = require('passport-yahoo').Strategy;

exports.strategy = function (core) {
  return new YahooStrategy({
    returnURL : core.config.hostUrl + 'auth/yahoo/callback',
    realm : core.config.hostUrl,
    stateless : true, // http://stackoverflow.com/questions/17274447/does-passport-js-require-session-affinity-when-deployed-on-multiple-node-js-inst
    passReqToCallback : true
  }, function (request, identifier, profile, done) {
    /*/
     console.log('==============');
     console.log('identifier=' + identifier);
     console.log(profile);
     console.log('==============');
     // not tested, but have to work
     //*/
    profile.provider = 'yahoo';
    profile.id = identifier;
    core.model.User.processOAuthProfile(request, profile, done);
  });
};

exports.routes = function (core, router) {
  router.get('/yahoo', core.passport.authenticate('yahoo'));
  router.get('/yahoo/callback', core.passport.authenticate('yahoo', {
    failureRedirect : '/auth/failure?strategy=yahoo',
    successRedirect : '/auth/success?strategy=yahoo'
  }));
};
