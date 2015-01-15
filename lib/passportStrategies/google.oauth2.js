'use strict';

var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

exports.strategy = function (core) {
  return new GoogleStrategy({
    consumerKey: core.config.passport.GOOGLE_CONSUMER_KEY,
    consumerSecret: core.config.passport.GOOGLE_CONSUMER_SECRET,
    callbackURL: core.config.hostUrl + 'auth/google/callback',
    stateless: true, // http://stackoverflow.com/questions/17274447/does-passport-js-require-session-affinity-when-deployed-on-multiple-node-js-inst
    passReqToCallback: true
  }, function (request, accessToken, refreshToken, profile, done) {
    console.log('==============AUTH VIA Google OAuth 2.0');
    console.log(profile);
    console.log('accessToken', accessToken);
    console.log('refreshToken', refreshToken);
    console.log('==============');
    if (profile.provider === 'google' && profile.id) {
      request.session.google_accessToken = accessToken;
      request.session.google_refreshToken = refreshToken;
      core.model.User.processOAuthProfile(request.user, profile, done);
    } else {
      return done(new Error('There is something strange instead of user profile!'));
    }
  });
};

exports.routes = function (core) {
  core.app.get('/auth/google', core.passport.authenticate('google', {
    scope: core.config.passport.GOOGLE_SCOPES || [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  }));
  core.app.get('/auth/google/callback', core.passport.authenticate('google', {
    failureRedirect: '/auth/failure',
    successRedirect: '/auth/success'
  }));
};
