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
      core.model.User.processOAuthProfile(request, profile, done);
    } else {
      return done(new Error('There is something strange instead of user profile!'));
    }
  });
};


exports.routes = function (core) {
  core.app.get('/auth/github', core.passport.authenticate('github'),
    function (req, res) {
      // The request will be redirected to GitHub for authentication, so this
      // function will not be called.
    });

  core.app.get('/auth/github/callback',
    core.passport.authenticate('github', {
      failureRedirect: '/auth/failure?strategy=github',
      successRedirect: '/auth/success?strategy=github',
      failureFlash: true
    })
  );
};
