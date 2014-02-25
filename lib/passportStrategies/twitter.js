'use strict';

var TwitterStrategy = require('passport-twitter').Strategy;

exports.strategy = function (core) {
  return new TwitterStrategy({
    consumerKey: core.config.passport.TWITTER_CONSUMER_KEY,
    consumerSecret: core.config.passport.TWITTER_CONSUMER_SECRET,
    callbackURL: core.config.hostUrl + 'auth/twitter/callback',
    passReqToCallback: true
  }, function (request, token, tokenSecret, profile, done) {
//    console.log('==============AUTH VIA TWITTER');
//    console.log(profile);
//    console.log('==============');
    if (profile.provider === 'twitter' && profile.id) {
      core.model.User.processOAuthProfile(request.user, profile, done);
    } else {
      return done(new Error('There is something strange instead of user profile!'));
    }
  });

};

exports.routes = function (core) {
/**
 * @method HTTPAuthorizationAPI#GET /auth/twitter
 * @description
 * Start oauth authorization with github as provider.
 * If user was authorized before the authorization request is done,
 * the oauth profile is attached to {@link User#keychain} of current user.
 * If user was present in database, he/she is authorized.
 * If user was not present in database, his/her account is created as verified.
 * After authorization user is redirected to
 * {@link HTTPAuthorizationAPI} GET /auth/success,
 * or {@link HTTPAuthorizationAPI} GET /auth/failure
 * endpoints.
 * This api endpoint is enabled when {@link passport} object
 * has fields of TWITTER_CONSUMER_KEY and TWITTER_CONSUMER_SECRET populated
 */
  core.app.get('/auth/twitter', core.passport.authenticate('twitter'));
  core.app.get('/auth/twitter/callback', core.passport.authenticate('twitter', {
    failureRedirect: '/auth/login',
    successRedirect: '/auth/success',
    failureFlash: true
  }));
};
