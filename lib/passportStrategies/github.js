'use strict';

var
  storeReferer = require('./storeRefererHelper.js'),
  GitHubStrategy = require('passport-github').Strategy;

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
      request.session.githubAccessToken = accessToken;
      request.session.githubRefreshToken = refreshToken;
      core.model.User.processOAuthProfile(request, profile, done);
    } else {
      return done(new Error('There is something strange instead of user profile!'));
    }
  });
};


exports.routes = function (core, router) {
  router.get('/github', storeReferer,  core.passport.authenticate('github'));

  router.get('/github/callback',
    core.passport.authenticate('github', {
      failureRedirect: '/auth/failure?strategy=github',
      successRedirect: '/auth/success?strategy=github'
    })
  );
};
