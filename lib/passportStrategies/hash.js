'use strict';

var HashStrategy = require('passport-hash').Strategy;

//used for verify account by email
//todo probably the {passReqToCallback: true} works
exports.strategy = function (core) {
  return new HashStrategy(function (hash, done) {
    core.model.User.findOneByHuntKeyAndVerifyEmail(hash, function (err, userFound) {
      done(err, userFound);
    });
  });
};

exports.routes = function (core) {
  core.app.get('/auth/confirm/:hash', core.passport.authenticate('hash', {
    successRedirect: '/auth/success?strategy=hash',
    failureRedirect: '/auth/failure?strategy=hash'
  }));
};
