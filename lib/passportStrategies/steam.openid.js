'use strict';

var SteamStrategy = require('passport-steam').Strategy;

exports.strategy = function (core) {
  return new SteamStrategy({
    returnURL: core.config.hostUrl + 'auth/steam/callback',
    realm: core.config.hostUrl,
    stateless: true, // http://stackoverflow.com/questions/17274447/does-passport-js-require-session-affinity-when-deployed-on-multiple-node-js-inst
    passReqToCallback: true
  }, function (request, identifier, profile, done) {
    /*/
     console.log('==============');
     console.log('identifier=' + identifier);
     console.log(profile);
     console.log('==============');
     //*/

    /*/

     identifier=http://steamcommunity.com/openid/id/7617
     { displayName: undefined,
     emails: [ { value: undefined } ],
     name: { familyName: undefined, givenName: undefined }

     //*/
    profile.provider = 'steam';
    profile.id = identifier; //emails usually is empty, because very few people publishes their emails on steam
    core.model.User.processOAuthProfile(request.user, profile, done);
  });
};

exports.routes = function (core) {
  core.app.get('/auth/steam', core.passport.authenticate('steam'));
  core.app.get('/auth/steam/callback', core.passport.authenticate('steam', { failureRedirect: '/auth/failure', successRedirect: '/auth/success' }));
};
