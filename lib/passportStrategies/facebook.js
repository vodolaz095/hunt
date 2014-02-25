'use strict';

var FacebookStrategy = require('passport-facebook').Strategy;

exports.strategy = function (core) {
  return new FacebookStrategy({
    clientID: core.config.passport.FACEBOOK_CLIENT_ID,
    clientSecret: core.config.passport.FACEBOOK_CLIENT_SECRET,
    callbackURL: core.config.hostUrl + 'auth/facebook/callback',
    passReqToCallback: true
  }, function (request, accessToken, refreshToken, profile, done) {
//    console.log('==============AUTH VIA FACEBOOK');
//    console.log(profile);
//    console.log('==============');
    if (profile.provider === 'facebook' && profile.id) {
      core.model.User.processOAuthProfile(request.user, profile, done);
    } else {
      return done(new Error('There is something strange instead of user profile!'));
    }
  });
};


exports.routes = function (core) {
/**
 * @method HTTPAuthorizationAPI#GET /auth/facebook
 * @description
 * Start oauth authorization with facebook as provider.
 * If user was authorized before the authorization request is done,
 * the oauth profile is attached to {@link User#keychain} of current user.
 * If user was present in database, he/she is authorized.
 * If user was not present in database, his/her account is created as verified.
 * After authorization user is redirected to
 * {@link HTTPAuthorizationAPI} GET /auth/success,
 * or {@link HTTPAuthorizationAPI} GET /auth/failure
 * endpoints.
 * This api endpoint is enabled when {@link passport} object
 * has fields of FACEBOOK_CLIENT_ID and FACEBOOK_CLIENT_SECRET populated
 */
  core.app.get('/auth/facebook', core.passport.authenticate('facebook'),
    function (req, res) {
      // The request will be redirected to GitHub for authentication, so this
      // function will not be called.
    });


  core.app.get('/auth/facebook/callback',
    core.passport.authenticate('facebook', {
      failureRedirect: '/auth/login',
      successRedirect: '/auth/success',
      failureFlash: true
    })
  );
};
