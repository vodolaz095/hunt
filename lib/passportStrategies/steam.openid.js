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
      profile.id = identifier;
      core.model.User.processOAuthProfile(request.user, profile, done);
  });
};

/**
 * @method HTTPAuthorizationAPI#GET /auth/steam
 * @description
 * Start openId authorization with steam as provider.
 * If user was authorized before the authorization request is done,
 * the oauth profile is attached to {@link User#keychain} of current user.
 * If user was present in database, he/she is authorized.
 * If user was not present in database, his/her account is created as verified.
 * After authorization user is redirected to
 * {@link HTTPAuthorizationAPI} GET /auth/success,
 * or {@link HTTPAuthorizationAPI} GET /auth/failure
 * endpoints.
 * This api endpoint is enabled when {@link passport} object
 * has fields of `google` set to true
 */
exports.routes = function (core) {
  core.app.get('/auth/steam', core.passport.authenticate('steam'));
  core.app.get('/auth/steam/callback', core.passport.authenticate('steam', { failureRedirect: '/auth/failure', successRedirect: '/auth/success' }));
};
