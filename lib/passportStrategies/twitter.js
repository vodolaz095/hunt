'use strict';

var TwitterStrategy = require('passport-twitter').Strategy;

exports.strategy = function (core) {
  return new TwitterStrategy({
    consumerKey : core.config.passport.TWITTER_CONSUMER_KEY,
    consumerSecret : core.config.passport.TWITTER_CONSUMER_SECRET,
    callbackURL : core.config.hostUrl + 'auth/twitter/callback',
    passReqToCallback : true
  }, function (request, token, tokenSecret, profile, done) {
//    console.log('==============AUTH VIA TWITTER');
//    console.log(profile);
//    console.log('==============');
    if (profile.provider === 'twitter' && profile.id) {
      request.session.twitterToken = token;
      request.session.twitterSecret = tokenSecret;
      core.model.User.processOAuthProfile(request, profile, done);
    } else {
      return done(new Error('There is something strange instead of user profile!'));
    }
  });

};

exports.routes = function (core) {
  core.app.get('/auth/twitter', core.passport.authenticate('twitter'));
  core.app.get('/auth/twitter/callback', core.passport.authenticate('twitter', {
    failureRedirect : '/auth/failure?strategy=twitter',
    successRedirect : '/auth/success?strategy=twitter'
  }));
};
