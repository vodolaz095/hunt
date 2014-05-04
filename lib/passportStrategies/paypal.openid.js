'use strict';

var PaypalStrategy = require('passport-paypal').Strategy;

exports.strategy = function (core) {
  return new PaypalStrategy({
    returnURL: core.config.hostUrl + 'auth/paypal/callback',
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

/*

identifier=https://www.paypal.com/webapps/auth/user/1b92ea94462fa94462f7e9fa94462f764ce7da94462fadb53c0fd
{ displayName: 'Slobodan Milich',
  emails: [ { value: 'doNotSpam@example.org' } ],
  name: { familyName: 'Milich', givenName: 'Slobodan' } }

 */

    if (Array.isArray(profile.emails) && profile.emails.length && profile.emails[0].value) {
      var gmail = profile.emails[0].value;
      profile.provider = 'email';
      profile.id = gmail;
      core.model.User.processOAuthProfile(request.user, profile, done);
    } else {
      return done(new Error('There is something strange instead of user profile'));
    }
  });
};

/**
 * @method HTTPAuthorizationAPI#GET /auth/paypal
 * @description
 * Start openId authorization with google as provider.
 * If user was authorized before the authorization request is done,
 * the oauth profile is attached to {@link User#keychain} of current user.
 * If user was present in database, he/she is authorized.
 * If user was not present in database, his/her account is created as verified.
 * After authorization user is redirected to
 * {@link HTTPAuthorizationAPI} GET /auth/success,
 * or {@link HTTPAuthorizationAPI} GET /auth/failure
 * endpoints.
 * This api endpoint is enabled when {@link passport} object
 * has fields of `paypal` set to true
 */
exports.routes = function (core) {
  core.app.get('/auth/paypal', core.passport.authenticate('paypal'));
  core.app.get('/auth/paypal/callback', core.passport.authenticate('paypal', { failureRedirect: '/auth/failure', successRedirect: '/auth/success' }));
};
