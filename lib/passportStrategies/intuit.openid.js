'use strict';

var IntuitStrategy = require('passport-intuit').Strategy;

exports.strategy = function (core) {
  return new IntuitStrategy({
    returnURL: core.config.hostUrl + 'auth/intuit/callback',
    realm: core.config.hostUrl,
    stateless: true, // http://stackoverflow.com/questions/17274447/does-passport-js-require-session-affinity-when-deployed-on-multiple-node-js-inst
    passReqToCallback: true
  }, function (request, identifier, profile, done) {
    /*/
     console.log('==============');
     console.log('identifier=' + identifier);
     console.log(profile);
     console.log('==============');

     //it have to work, but i cannot signup at intuit.com

     //*/
    profile.provider = 'intuit';
    profile.id = identifier;
    core.model.User.processOAuthProfile(request.user, profile, done);
  });
};

exports.routes = function (core) {
  core.app.get('/auth/intuit', core.passport.authenticate('intuit'));
  core.app.get('/auth/intuit/callback', core.passport.authenticate('intuit', { failureRedirect: '/auth/failure', successRedirect: '/auth/success' }));
};
