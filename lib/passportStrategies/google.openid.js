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

/**
 * @method HTTPAuthorizationAPI#GET /auth/google
 * @description
 * Start openId authorization with google as provider.
 * If user was authorized before the authorization request is done,
 * the oauth profile is attached to {@link User#keychain} of current user.
 * If user was present in database, he/she is authorized.
 * If user was not present in database, his/her account is created as verified.
 * After authorization user is redirected to
 * {@link HTTPAuthorizationAPI} GET /auth/success,
 * or {@link HTTPAuthorizationAPI} GET /auth/failure
 * endpoints.
 * This api endpoint is enabled when {@link passport} object
 * has fields of `google` set to true
 */
exports.routes = function (core) {
  core.app.get('/auth/google', core.passport.authenticate('google'));
  core.app.get('/auth/google/callback', core.passport.authenticate('google', { failureRedirect: '/auth/failure', successRedirect: '/auth/success' }));
};
