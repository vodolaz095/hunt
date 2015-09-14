'use strict';

var VKontakteStrategy = require('passport-vkontakte').Strategy;

exports.strategy = function (core) {
  return new VKontakteStrategy({
    clientID : core.config.passport.VK_APP_ID,
    clientSecret : core.config.passport.VK_APP_SECRET,
    callbackURL : core.config.hostUrl + 'auth/vk/callback',
    passReqToCallback : true
  }, function (request, accessToken, refreshToken, profile, done) {
//    console.log('==============AUTH VIA VK.com');
//    console.log(profile);
//    console.log('vk_accessToken',accessToken);
//    console.log('vk_refreshToken',refreshToken);
//    console.log('==============');
    if (profile.provider === 'vkontakte' && profile.id) {
      request.session.vkAccessToken = accessToken;
      request.session.vkRefreshToken = refreshToken; //never recieved :-(
      core.model.User.processOAuthProfile(request, profile, done);
    } else {
      return done(new Error('There is something strange instead of user profile!'));
    }
  });
};


exports.routes = function (core, router) {
  router.get('/vk',
    core.passport.authenticate('vkontakte', { scope : core.config.passport.VK_SCOPE || [] }),
    function (req, res) {
      // The request will be redirected to vk.com for authentication, so this
      // function will not be called.
    });


  router.get('/vk/callback',
    core.passport.authenticate('vkontakte', {
      failureRedirect : '/auth/failure?strategy=vkontakte',
      successRedirect : '/auth/success?strategy=vkontakte'
    }));
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