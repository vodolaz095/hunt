'use strict';

var VKontakteStrategy = require('passport-vkontakte').Strategy;

exports.strategy = function (core) {
  return new VKontakteStrategy({
    clientID: core.config.passport.VK_APP_ID,
    clientSecret: core.config.passport.VK_APP_SECRET,
    callbackURL: core.config.hostUrl + 'auth/vk/callback',
    passReqToCallback: true
  }, function (request, accessToken, refreshToken, profile, done) {
//    console.log('==============AUTH VIA VK.com');
//    console.log(profile);
//    console.log('==============');
    if (profile.provider === 'vkontakte' && profile.id) {
      core.model.User.processOAuthProfile(request.user, profile, done);
    } else {
      return done(new Error('There is something strange instead of user profile!'));
    }
  });
};


exports.routes = function (core) {
/**
 * @method HTTPAuthorizationAPI#GET /auth/vk
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
 * has fields of VK_APP_ID and VK_APP_SECRET populated.
 * VK_SCOPE property is also used for setting access rules for vk.com application
 */
  core.app.get('/auth/vk',
    core.passport.authenticate('vkontakte', {scope: core.config.passport.VK_SCOPE || []}),
    function (req, res) {
      // The request will be redirected to vk.com for authentication, so this
      // function will not be called.
    });


  core.app.get('/auth/vk/callback',
    core.passport.authenticate('vkontakte', {
      failureRedirect: '/auth/login',
      successRedirect: '/auth/success',
      failureFlash: true
    })
  );
};


/**
 * Profile example

 { id: 51776161,
  username: 'vodolaz095',
  displayName: 'Анатолий Остроумов',
  name: { familyName: 'Остроумов', givenName: 'Анатолий' },
  gender: 'male',
  profileUrl: 'http://vk.com/vodolaz095',
  photos:
   [ { value: 'http://cs317918.vk.me/v317918161/4099/DRvoJBwl9_4.jpg',
       type: 'photo' } ],
  provider: 'vkontakte',
  _raw: '{"response":[{"id":51776161,"first_name":"Анатолий","last_name":"Остроумов","sex":2,"screen_name":"vodolaz095","photo":"http:\\/\\/cs317918.vk.me\\/v317918161\\/4099\\/DRvoJBwl9_4.jpg"}]}',
  _json:
   { id: 51776161,
     first_name: 'Анатолий',
     last_name: 'Остроумов',
     sex: 2,
     screen_name: 'vodolaz095',
     photo: 'http://cs317918.vk.me/v317918161/4099/DRvoJBwl9_4.jpg' } }
 */