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
      request.session.facebookAccessToken = accessToken;
      request.session.facebookRefreshToken = refreshToken;
      core.model.User.processOAuthProfile(request, profile, done);
    } else {
      return done(new Error('There is something strange instead of user profile!'));
    }
  });
};


exports.routes = function (core, router) {
  router.get('/facebook', core.passport.authenticate('facebook'),
    function (req, res) {
      // The request will be redirected to GitHub for authentication, so this
      // function will not be called.
    });
  router.get('/facebook/callback',
    core.passport.authenticate('facebook', {
      failureRedirect: '/auth/failure?strategy=facebook',
      successRedirect: '/auth/success?strategy=facebook',
      failureFlash: true
    })
  );
};
