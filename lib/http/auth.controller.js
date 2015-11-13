'use strict';
require('colors');


/**
 * @class passport
 * @extends config
 * @classdesc
 * Object that hold the passport.js configuration parameters
 *
 * @property {boolean} local - enable local strategy
 * @property {boolean} signUpByEmail - user can signup by making POST /auth/signup with email and password, default is true, requires local strategy
 * @property {boolean} verifyEmail - user have to follow link in email address to verify his account, default is true
 * @property {string} verifyEmailTemplate - path to template for verifying email template
 * @property {boolean} resetPassword - allow user to reset password for account, default is true
 * @property {string} resetPasswordEmailTemplate - template for email used for reseting password
 * @property {string} resetPasswordPageTemplate - template for page used for reseting password
 *
 * @property {boolean} steam - authorization by Steam openId - default is false - disabled.
 *
 * @property {number} sessionExpireAfterSeconds - time to live of cookie based http sessions, default is 180 seconds.
 *
 * @property {string} GOOGLE_CLIENT_KEY - used to authorize users by {@link https://developers.google.com/accounts/docs/OAuth2 | Google OAuth 2.0 strategy}, obtainable in {@link https://console.developers.google.com/ Google Developers' console }
 * @property {string} GOOGLE_CLIENT_SECRET  - used to authorize users by {@link https://developers.google.com/accounts/docs/OAuth2 | Google OAuth 2.0 strategy}, obtainable in {@link https://console.developers.google.com/ Google Developers' console }
 * @property {Array.<string>} GOOGLE_SCOPES - OAuth 2.0 scopes required by application - see {@link https://developers.google.com/+/api/oauth#login-scopes}. Default value is `['https://www.googleapis.com/auth/userinfo.profile','https://www.googleapis.com/auth/userinfo.email']`
 *
 * @property {string} GITHUB_CLIENT_ID - used for github oauth, is populated automatically from enviroment value of the same name, obtainable here {@link https://github.com/settings/applications}
 * @property {string} GITHUB_CLIENT_SECRET - used for github oauth, is populated automatically from enviroment value of the same name, obtainable here {@link https://github.com/settings/applications}
 *
 * @property {string} TWITTER_CONSUMER_KEY - used for twitter oauth, is populated automatically from enviroment value of the same name, obtainable here {@link https://dev.twitter.com/}
 * @property {string} TWITTER_CONSUMER_SECRET  - used for twitter oauth, is populated automatically from enviroment value of the same name, obtainable here {@link https://dev.twitter.com/}
 *
 * @property {string} VK_APP_ID - used for vk.com oauth, is populated automatically from enviroment value of the same name, obtainable here {@link https://vk.com/dev}
 * @property {string} VK_APP_SECRET - used for vk.com oauth, is populated automatically from enviroment value of the same name, obtainable here {@link https://vk.com/dev}
 * @property {Array.<string>} VK_SCOPE - array of scopes, that are required from user to share with application - used in vk.com authorization strategy
 *
 * @property {string} FACEBOOK_CLIENT_ID  - used for facebook.com oauth, is populated automatically from enviroment value of the same name, obtainable here {@link https://developers.facebook.com/}
 * @property {string} FACEBOOK_CLIENT_SECRET - used for facebook.com oauth, is populated automatically from enviroment value of the same name, obtainable here {@link https://developers.facebook.com/}
 */


module.exports = exports = function (core, router) {
  var
    strategies = [],
    routes = [];
//Storing user in session, storage key is huntKey
  core.passport.serializeUser(function (user, done) {
    done(null, user.huntKey);
  });

//Retrieving user from session
  core.passport.deserializeUser(function (huntKey, done) {
    core.model.User.findOneByHuntKey(huntKey, done);
  });

//openid strategies
  [
    'steam'
//    'yahoo', 'intuit', 'paypal' - doesn't works with passportjs 0.3.x!
  ]
    .map(function (strategyName) {
      if (core.config.passport[strategyName] === true) {
        strategies.push(require('./../passportStrategies/' + strategyName + '.openid.js'));
        console.log('PassportManager:'.green + ' ' + strategyName.toUpperCase() + ' OpenID authorization enabled!');
      }
    });

//oauth strategies
  if (core.config.passport.GOOGLE_CLIENT_ID && core.config.passport.GOOGLE_CLIENT_SECRET) {
    strategies.push(require('./../passportStrategies/google.oauth2.js'));
    console.log('PassportManager:'.green + ' Google OAuth 2.0 authorization enabled!');
  }

  if (core.config.passport.GITHUB_CLIENT_ID && core.config.passport.GITHUB_CLIENT_SECRET) {
    strategies.push(require('./../passportStrategies/github.js'));
    console.log('PassportManager:'.green + ' Github authorization enabled!');
  }

  if (core.config.passport.TWITTER_CONSUMER_KEY && core.config.passport.TWITTER_CONSUMER_SECRET) {
    strategies.push(require('./../passportStrategies/twitter.js'));
    console.log('PassportManager:'.green + ' Twitter authorization enabled!');
  }

  if (core.config.passport.VK_APP_ID && core.config.passport.VK_APP_SECRET) {
    strategies.push(require('./../passportStrategies/vkcom.js'));
    console.log('PassportManager:'.green + ' VK authorization enabled!');
  }

  if (core.config.passport.FACEBOOK_CLIENT_ID && core.config.passport.FACEBOOK_CLIENT_SECRET) {
    strategies.push(require('./../passportStrategies/facebook.js'));
    console.log('PassportManager:'.green + ' Facebook authorization enabled!');
  }

  //loading local strategy
  if (core.config.passport.local === true) {
    router.post('/login', function (request, response) {
      var message = 'Invalid username, email or password!';
      if (request.user) {
        if (request.is('json')) {
          core
            .errorResponses
            .doError(response, 400, 'You are already authorized!');
        } else {
          request.flash('error', 'You are already authorized!');
          response.redirect('/auth/failure?strategy=local');
        }
      } else {
        core.async.waterfall([
          function (cb) {
            request.model.User.signIn(request.body.username, request.body.password, cb);
          },
          function (userFound, cb) {
            if (userFound) {
              request.logIn(userFound, cb);
            } else {
              cb(new Error('UNABLE_TO_SIGNIN'));
            }
          }
        ], function (error) {
          if (error) {
            if (error.message === 'UNABLE_TO_SIGNIN') {
              if (request.is('json')) {
                core.errorResponses.doError(response, 403, message);
              } else {
                request.flash('error', message);
                response.redirect('/auth/failure?strategy=local');
              }
            } else {
              throw error;
            }
          } else {
            if (request.is('json')) {
              response
                .status(200)
                .json({
                  'status': 'Ok',
                  'code': 200,
                  'message': 'Welcome!',
                  'userId': request.user.id,
                  'huntKey': request.user.huntKey,
                  'csrf': response.locals.csrf
                });
            } else {
              response.redirect('/auth/success?strategy=local');
            }
          }
        });
      }
    });
    console.log('PassportManager:'.green + ' local strategy enabled!');
    if (core.config.passport.signUpByEmail === true) {
//routes for signUp
      router.post('/isBusy', function (request, response) {
        request.model.User.findOneByEmailOrUsername(request.body.email, function (err, userFound) {
          response.jsonp({
            'isBusy': userFound ? true : false
          });
        });
      });

      router.post('/signup', function (request, response) {
        if (request.body.email && core.validator.isEmail(request.body.email) && request.body.password) {
          request.model.User.signUp(request.body.email, request.body.password,
            function (err, user) {
              if (err) {
                throw err;
              }
              if (user) {
//sending user email for account verification
                if (core.config.passport.verifyEmail) {
                  request.flash('success', 'Thanks for signing up! Please, verify your email by following link in it!');

                  user.notifyByEmail({
                    'subject': 'Email address verification',
                    'template': core.config.passport.verifyEmailTemplate,
                    'verifyUrl': core.config.hostUrl + 'auth/confirm/' + user.keychain.welcomeLink
                  });
                } else {
                  request.flash('success', 'Thanks for signing up!');
                }

//authorising this user after signing up
                request.login(user, function (err) {
                  if (err) {
                    throw err;
                  }

                  if (request.is('json')) {
                    response
                      .status(200)
                      .json({
                        'code': 200,
                        'status': 'Ok',
                        'user': {
                          'id': user.id,
                          'huntKey': user.huntKey
                        },
                        'message': core.config.passport.verifyEmail ? 'Thanks for signing up! Please, verify your email by following link in it!' : 'Thanks for signing up!'
                      });
                  } else {
                    response.redirect('back');
                  }
                });
              } else {
                if (request.is('json')) {
                  response
                    .status(400)
                    .json({
                      'code': 400,
                      'status': 'Bad request',
                      'message': 'Error signing up! Probably the email address provided is in use.'
                    });
                } else {
                  request.flash('error', 'Error signing up! Probably the email address provided is in use.');
                  response.redirect('back');
                }
              }
            });
        } else {
          if (request.is('json')) {
            response
              .status(400)
              .json({
                'code': 400,
                'status': 'Bad request',
                'message': 'Malformed email'
              });
          } else {
            request.flash('error', 'Error signing up - malformed email!');
            response.redirect('back');
          }
        }
      });

      if (core.config.passport.verifyEmail === true) {
        console.log('PassportManager:'.green + ' email verification enabled!');
        router.get('/confirm/:hash', function (request, response) {
          var welcomeLink = request.params.hash;
          if (request.user) {
            if (request.user.keychain && request.user.keychain.welcomeLink === welcomeLink) {
              delete request.user.keychain.welcomeLink;
              request.user.markModified('keychain');
              request.user.accountVerified = true;
              request.user.save(function (error) {
                if (error) {
                  throw error;
                }
                response.redirect('/auth/success?strategy=confirm');
              });
            } else {
              response.redirect('/auth/failure?strategy=confirm');
            }
          } else {
            request.model.User.findOneByWelcomeLinkAndVerifyEmail(welcomeLink, function (error, userFound) {
              if (error) {
                throw error;
              }
              if (userFound) {
                request.login(userFound, function (error) {
                  if (error) {
                    throw error;
                  }
                  response.redirect('/auth/success?strategy=confirm');
                });
              } else {
                response.redirect('/auth/failure?strategy=confirm');
              }
            });
          }
        });
      }
    }

    if (core.config.passport.resetPassword) {
//route to ask for password reset email
      console.log('PassportManager:'.green + ' reseting password enabled!');

      router.post('/restoreAccount', function (request, response) {
        var message = 'Check your email address, we have send you instructions for restoring account';
        if (request.body.email && core.validator.isEmail(request.body.email)) {
          request.model.User.findOneByEmailOrUsername(request.body.email, function (err, userFound) {
            if (err) {
              throw err;
            }
            if (userFound) {
              userFound.keychain = userFound.keychain || {};
              userFound.keychain.welcomeLink = core.rack();
              userFound.invalidateSession(function (err) {
                if (err) {
                  throw err;
                }
                userFound.notifyByEmail({
                  'subject': 'Reset password',
                  'template': core.config.passport.resetPasswordEmailTemplate,
                  'resetUrl': core.config.hostUrl + 'auth/reset/' + userFound.keychain.welcomeLink
                });
              });
            }
            if (request.is('json')) {
              response
                .status(201)
                .json({
                  'status': 'Created',
                  'code': 201,
                  'message': message
                });
            } else {
              request.flash('success', message); //haha)
              response.redirect('back');
            }
          });
        } else {
          if (request.is('json')) {
            response
              .status(400)
              .json({
                'status': 'Bad request',
                'code': 400,
                'message': 'Malformed email address'
              });
          } else {
            request.flash('error', 'Malformed email address');
            response.redirect('back');
          }
        }
      });

//route to render page with form to reset password
      router.get('/reset/:resetLink', function (request, response, next) {
        if (request.user) {
          response.redirect('/');
        } else {
          request.model.User.findOneByKeychain('welcomeLink', request.params.resetLink, function (err, userFound) {
            if (err) {
              throw err;
            }
            if (userFound) {
              response.render('' + core.config.passport.resetPasswordPageTemplate, {
                'title': 'Reset your password',
                'description': 'Welcome back!',
                'welcomeLink': userFound.keychain.welcomeLink
              });
            } else {
              next();
            }
          });
        }
      });

//route to reset password
      router.post('/resetPassword', function (request, response) {
        var message = 'Thanks! Your password is reset!';
        if (request.body.reset && request.body.password) {
          request.model.User.findOneByKeychain('welcomeLink', request.body.reset, function (err, userFound) {
            if (err) {
              throw err;
            }
            if (userFound) {
              userFound.password = request.body.password;
              userFound.save(function (error) {
                if (error) {
                  throw error;
                }
                request.flash('success', message);
                response.redirect('back');
              });
            } else {
              request.flash('success', message); // ;-)
              response.redirect('back');
            }
          });
        } else {
          response.send(400, 'Wrong request! huntKey and password are missed!');
        }
      });
    }
  }
//adding some always working routes for authorization
//they can be overloaded in application by Hunt.extendRoutes(function(core){});
  router.get('/success', function (req, res) {
    if (req.user) {
      req.flash('success', 'Welcome to our site, ' + req.user.displayName + '!');
    }
    res.redirect('/');
  });

  router.get('/failure', function (req, res) {
    if (!req.user) {
      req.flash('error', 'Authorization failed!');
    }
    res.redirect('/');
  });

  router.all('/logout', function (req, res) {
    if (req.user) {
      req.flash('success', 'Goodbye, ' + req.user.displayName + '!');
    }
    req.logout();
    res.redirect(req.headers.referer || '/');
  });


  //initializing strategies defined by Hunt.extendStrategy
  strategies.map(function (strategy) {
    core.passport.use(strategy.strategy(core));
    routes.push(strategy.routes);
  });

//adding routes specific to stategies
  routes.map(function (r) {
    r(core, router);
  });
};

