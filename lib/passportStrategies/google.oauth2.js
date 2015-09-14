'use strict';

var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

exports.strategy = function (core) {
  return new GoogleStrategy({
    clientID: core.config.passport.GOOGLE_CLIENT_ID,
    clientSecret: core.config.passport.GOOGLE_CLIENT_SECRET,
    callbackURL: core.config.hostUrl + 'auth/google/callback',
    stateless: true, // http://stackoverflow.com/questions/17274447/does-passport-js-require-session-affinity-when-deployed-on-multiple-node-js-inst
    passReqToCallback: true
  }, function (request, accessToken, refreshToken, profile, done) {
    /*
     console.log('==============AUTH VIA Google OAuth 2.0');
     console.log(profile);
     console.log('accessToken', accessToken);
     console.log('refreshToken', refreshToken);
     console.log('==============');
     */
    if (profile.provider === 'google' && profile.id) {
      request.session.googleAccessToken = accessToken;
      request.session.googleRefreshToken = refreshToken;
      core.model.User.processOAuthProfile(request, profile, done);
    } else {
      return done(new Error('There is something strange instead of user profile!'));
    }
  });
};

exports.routes = function (core, router) {
  router.get('/google', core.passport.authenticate('google', {
    scope: core.config.passport.GOOGLE_SCOPES || [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  }));
  router.get('/google/callback', core.passport.authenticate('google', {
    failureRedirect: '/auth/failure?strategy=google',
    successRedirect: '/auth/success?strategy=google'
  }));
};
