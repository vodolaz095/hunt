'use strict';

var GitHubStrategy = require('passport-github').Strategy;

exports.strategy = function (core) {
  return new GitHubStrategy({
    clientID: core.config.passport.GITHUB_CLIENT_ID,
    clientSecret: core.config.passport.GITHUB_CLIENT_SECRET,
//    scope:['user:email'], //http://developer.github.com/v3/oauth/#scopes
    callbackURL: core.config.hostUrl + 'auth/github/callback',
    userAgent: core.config.hostUrl,
    passReqToCallback: true
  }, function (request, accessToken, refreshToken, profile, done) {
//    console.log('==============AUTH VIA GITHUB');
//    console.log(profile);
//    console.log('==============');
    if (profile.provider === 'github' && profile.id) {
      core.model.User.processOAuthProfile(request.user, profile, done);
    } else {
      return done(new Error('There is something strange instead of user profile!'));
    }
  });
};


exports.routes = function (core) {
/**
 * @method HTTPAuthorizationAPI#GET /auth/github
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
 * has fields of GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET populated
 */
  core.app.get('/auth/github', core.passport.authenticate('github'),
    function (req, res) {
      // The request will be redirected to GitHub for authentication, so this
      // function will not be called.
    });


  core.app.get('/auth/github/callback',
    core.passport.authenticate('github', {
      failureRedirect: '/auth/login',
      successRedirect: '/auth/success',
      failureFlash: true
    })
  );
};
