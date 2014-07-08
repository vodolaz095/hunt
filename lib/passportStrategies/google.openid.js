'use strict';

var GoogleStrategy = require('passport-google').Strategy;

exports.strategy = function (core) {
  return new GoogleStrategy({
    returnURL: core.config.hostUrl + 'auth/google/callback',
    realm: core.config.hostUrl,
    stateless: true, // http://stackoverflow.com/questions/17274447/does-passport-js-require-session-affinity-when-deployed-on-multiple-node-js-inst
    passReqToCallback: true
  }, function (request, identifier, profile, done) {
    /*/
     console.log('==============');
     console.log('identifier=' + identifier);
     console.log(profile);
     console.log('==============');
     //*/
    if (Array.isArray(profile.emails) && profile.emails.length && profile.emails[0].value) {
      var gmail = profile.emails[0].value;
      profile.provider = 'email';
      profile.id = gmail;
      core.model.User.processOAuthProfile(request.user, profile, done);
    } else {
      return done(new Error('There is something strange instead of user profile'));
    }
  });
};

exports.routes = function (core) {
  core.app.get('/auth/google', core.passport.authenticate('google'));
  core.app.get('/auth/google/callback', core.passport.authenticate('google', { failureRedirect: '/auth/failure', successRedirect: '/auth/success' }));
};
