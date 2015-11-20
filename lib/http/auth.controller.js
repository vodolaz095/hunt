'use strict';

var
  winston = require('winston'),
  storeReferer = require('./../passportStrategies/storeRefererHelper.js');

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
        winston.silly('PassportManager: %s OpenID authorization enabled!', strategyName.toUpperCase());
      }
    });

//oauth strategies
  if (core.config.passport.GOOGLE_CLIENT_ID && core.config.passport.GOOGLE_CLIENT_SECRET) {
    strategies.push(require('./../passportStrategies/google.oauth2.js'));
    winston.silly('PassportManager: Google OAuth 2.0 authorization enabled!');
  }

  if (core.config.passport.GITHUB_CLIENT_ID && core.config.passport.GITHUB_CLIENT_SECRET) {
    strategies.push(require('./../passportStrategies/github.js'));
    winston.silly('PassportManager: Github OAuth 2.0 authorization enabled!');
  }

  if (core.config.passport.TWITTER_CONSUMER_KEY && core.config.passport.TWITTER_CONSUMER_SECRET) {
    strategies.push(require('./../passportStrategies/twitter.js'));
    winston.silly('PassportManager: Twitter OAuth 2.0 authorization enabled!');
  }

  if (core.config.passport.VK_APP_ID && core.config.passport.VK_APP_SECRET) {
    strategies.push(require('./../passportStrategies/vkcom.js'));
    winston.silly('PassportManager: VK OAuth 2.0 authorization enabled!');
  }

  if (core.config.passport.FACEBOOK_CLIENT_ID && core.config.passport.FACEBOOK_CLIENT_SECRET) {
    strategies.push(require('./../passportStrategies/facebook.js'));
    winston.silly('PassportManager: Facebook OAuth 2.0 authorization enabled!');
  }

  //loading local strategy
  if (core.config.passport.local === true) {
    var
      maxAge = core.config.passport.maxAge || 7 * 24 * 60 * 60 * 1000; //1 week

    router.post('/login', storeReferer, function (request, response) {
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
            if (!!request.body.remember) {
              response.cookie('remember', request.user.huntKey, {'maxAge': maxAge, 'httpOnly': true, 'signed': true});
            }

            /**
             * Event is emitted each time user signs in
             *
             * @event Hunt#user:signin:*
             * @type {object}
             * @property {string} type - type of event `auth`
             * @property {object} info additional information
             * @property {User} user - user, related to this event
             * @tutorial authorization
             * @see User
             *
             * @example
             *
             * Hunt.on('user:signin:*', function(payload){
             *   console.log('We catch '+this.event.join(':') + 'event, which means '+ payload.user.displayName + ' signed in!');
             * });
             *
             */


            /**
             * Event is emitted each time user signs in
             *
             * @event Hunt#user:signin:local
             * @type {object}
             * @property {string} type - type of event `auth`
             * @property {object} info additional information
             * @property {User} user - user, related to this event
             * @tutorial authorization
             * @see User
             *
             * @example
             *
             * Hunt.on('user:signin:local', function(payload){
             *   console.log('We catch '+this.event.join(':') + 'event, which means '+ payload.user.displayName + ' authorized by local strategy!');
             * });
             *
             */
            core.emit(['user', 'signin', 'local'], {
              'ip': request.ip,
              'ips': request.ips,
              'userAgent': request.headers['user-agent'],
              'user': request.user
            });

            winston.info('user:signin:local', {
              'ip': request.ip,
              'ips': request.ips,
              'userAgent': request.headers['user-agent'],
              'userId': request.user.id,
              'userEmail': request.user.email,
              'userName': request.user.username,
              'user': request.user.toString()
            });

            if (request.is('json')) {
              response
                .status(200)
                .json({
                  'status': 'Ok',
                  'code': 200,
                  'message': 'Welcome!',
                  'userId': request.user.id,
                  'huntKey': request.user.huntKey
                });
            } else {
              response.redirect('/auth/success?strategy=local');
            }
          }
        });
      }
    });
    winston.silly('Local strategy authorization enabled!');
    if (core.config.passport.signUpByEmail === true) {
//routes for signUp
      router.post('/isBusy', function (request, response) {
        request.model.User.findOneByEmailOrUsername(request.body.email, function (err, userFound) {
          response.jsonp({
            'isBusy': userFound ? true : false
          });
        });
      });

      router.post('/signup', storeReferer, function (request, response) {
        var
          username = request.body.username,
          email = request.body.email,
          password = request.body.password,
          userAlreadySignedUp,
          errors = [];

        core.async.series(
          [
            function (cb) {
              if (!request.body.email) {
                errors.push('Email is required!');
              }
              if (!request.body.password) {
                errors.push('Password is required!');
              }
              if (errors.length > 0) {
                cb(new Error('MISSING_PARAMETERS'));
              } else {
                cb(null);
              }
            },
            function (cb) {
              if (core.validator.isEmail(request.body.email)) {
                cb(null);
              } else {
                errors.push('Email is malformed!');
                cb(new Error('MALFORMED_EMAIL'));
              }
            },
            function (cb) {
              request.model
                .User.findOneByKeychain('email', request.body.email, function (error, userFound) {
                if (error) {
                  cb(error);
                } else {
                  if (userFound) {
                    if (userFound.password(password)) {
                      userAlreadySignedUp = userFound;
                      cb(null);
                    } else {
                      errors.push('Email is in use!');
                      cb(new Error('EMAIL_IN_USE'));
                    }
                  } else {
                    cb(null);
                  }
                }
              });
            },
            function (cb) {
              if (userAlreadySignedUp) {
                return cb(null);
              }

              if (username) {
                request.model
                  .User.findOneByKeychain('username', username, function (error, userFound) {
                  if (error) {
                    cb(error);
                  } else {
                    if (userFound) {
                      if (userFound.password(password)) {
                        userAlreadySignedUp = userFound;
                        cb(null);
                      } else {
                        errors.push('Username is in use!');
                        cb(new Error('USERNAME_IN_USE'));
                      }
                    } else {
                      cb(null);
                    }
                  }
                });
              } else {
                cb(null);
              }
            },
            function (cb) {
              if (userAlreadySignedUp) {
                return request.login(userAlreadySignedUp, cb);
              }
              core.model.User.signUp(username, email, password, function (error, userSaved) {
                if (error) {
                  cb(error);
                } else {
                  request.login(userSaved, cb);
                }
              });
            },
            function (cb) {
              if (request.user) {
                if (userAlreadySignedUp) {
                  request.flash('success', 'Welcome to our site, ' + request.user.toString() + '!');
                } else {
                  if (core.config.passport.verifyEmail) {
                    request.flash('success', 'Thanks for signing up! Please, verify your email by following link in it!');
                    request.user.notifyByEmail({
                      'subject': 'Email address verification',
                      'template': core.config.passport.verifyEmailTemplate,
                      'verifyUrl': core.config.hostUrl + 'auth/confirm/' + request.user.keychain.welcomeLink
                    });
                  } else {
                    request.flash('success', 'Thanks for signing up!');
                  }
                }

                core.emit(['user', 'signup', 'local'], {
                  'ip': request.ip,
                  'ips': request.ips,
                  'userAgent': request.headers['user-agent'],
                  'user': request.user
                });

                winston.info('user:signup:local:%s', request.user.id, {
                  'ip': request.ip,
                  'ips': request.ips,
                  'userAgent': request.headers['user-agent'],
                  'userId': request.user.id,
                  'userEmail': request.user.email,
                  'userName': request.user.username,
                  'user': request.user.toString()
                });

                cb();
              } else {
                cb(new Error('Unable to sign up user!'));
              }
            }
          ],
          function (error) {
            if (error) {
              switch (error.message) {
              case 'MISSING_PARAMETERS':
                break;
              case 'MALFORMED_EMAIL':
                break;
              case 'EMAIL_IN_USE':
                break;
              case 'USERNAME_IN_USE':
                break;
              default:
                throw error;
              }
            }
            if (request.is('json')) {
              if (errors.length > 0) {
                response.status(400).json({
                  'code': 400,
                  'status': 'Error',
                  'message': 'Unable to create account!',
                  'validationErrors': errors
                });
              } else {
                response
                  .status(201)
                  .json({
                    'status': 'Ok',
                    'code': 201,
                    'message': 'Account created!',
                    'userId': request.user.id,
                    'huntKey': request.user.huntKey
                  });
              }
            } else {
              errors.map(function (e) {
                request.flash('error', 'Error creating account: ' + e);
              });
              response.redirect('back');
            }
          }
        );
      });


      if (core.config.passport.verifyEmail === true) {
        winston.silly('Email verification enabled!');
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

                core.emit(['user', 'confirm'], {
                  'ip': request.ip,
                  'ips': request.ips,
                  'userAgent': request.headers['user-agent'],
                  'user': request.user
                });

                winston.info('user:confirm:%s', request.user.id, {
                  'ip': request.ip,
                  'ips': request.ips,
                  'userAgent': request.headers['user-agent'],
                  'userId': request.user.id,
                  'userEmail': request.user.email,
                  'userName': request.user.username,
                  'user': request.user.toString()
                });

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

                  core.emit(['user', 'confirm'], {
                    'ip': request.ip,
                    'ips': request.ips,
                    'userAgent': request.headers['user-agent'],
                    'user': request.user
                  });

                  winston.info('user:confirm:%s', request.user.id, {
                    'ip': request.ip,
                    'ips': request.ips,
                    'userAgent': request.headers['user-agent'],
                    'userId': request.user.id,
                    'userEmail': request.user.email,
                    'userName': request.user.username,
                    'user': request.user.toString()
                  });
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
      winston.silly('PassportManager: reset password enabled!');

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

              core.emit(['user', 'resetpassword', 'require'], {
                'ip': request.ip,
                'ips': request.ips,
                'userAgent': request.headers['user-agent'],
                'user': userFound
              });

              winston.info('user:resetpassword:require:%s', userFound.id, {
                'ip': request.ip,
                'ips': request.ips,
                'userAgent': request.headers['user-agent'],
                'userId': userFound.id,
                'userEmail': userFound.email,
                'userName': userFound.username,
                'user': userFound.toString()
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

              core.emit(['user', 'resetpassword', 'render'], {
                'ip': request.ip,
                'ips': request.ips,
                'userAgent': request.headers['user-agent'],
                'user': userFound
              });

              winston.info('user:resetpassword:render:%s', userFound.id, {
                'ip': request.ip,
                'ips': request.ips,
                'userAgent': request.headers['user-agent'],
                'userId': userFound.id,
                'userEmail': userFound.email,
                'userName': userFound.username,
                'user': userFound.toString()
              });

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
              core.async.series([
                function (cb) {
                  userFound.password = request.body.password;
                  userFound.save(cb);
                },
                function (cb) {
                  request.logIn(userFound, cb);
                }
              ], function (error) {
                if (error) {
                  throw error;
                }
                if (request.is('json')) {


                  core.emit(['user', 'resetpassword', 'perform'], {
                    'ip': request.ip,
                    'ips': request.ips,
                    'userAgent': request.headers['user-agent'],
                    'user': request.user
                  });

                  winston.info('user:resetpassword:perform:%s', userFound.id, {
                    'ip': request.ip,
                    'ips': request.ips,
                    'userAgent': request.headers['user-agent'],
                    'userId': request.user.id,
                    'userEmail': request.user.email,
                    'userName': request.user.username,
                    'user': request.user.toString()
                  });

                } else {
                  request.flash('success', message);
                  response.redirect('back');
                }
              });
            } else {
              request.flash('success', message); // ;-)
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
                'message': 'Body parameters of `welcomeLink` or `password` are missing!'
              });
          } else {
            request.flash('error', 'Parameters of `welcomeLink` or `password` are missing!');
            response.redirect('back');
          }
        }
      });
    }
  }
//adding some always working routes for authorization
//they can be overloaded in application by Hunt.extendRoutes(function(core){});
  router.get('/success', function (req, res) {
    if (req.user) {
      req.flash('success', 'Welcome to our site, ' + req.user.toString() + '!');
    }
    var ref = req.session.ref;
    if (ref) {
      delete req.session.ref;
      res.redirect(ref);
    } else {
      res.redirect('/');
    }
  });

  router.get('/failure', function (req, res) {
    if (!req.user) {
      req.flash('error', 'Authorization failed!');
    }
    var ref = req.session.ref;
    if (ref) {
      delete req.session.ref;
      res.redirect(ref);
    } else {
      res.redirect('/');
    }
  });

  router.all('/logout', function (req, res) {
    if (req.user) {
      var farewell = 'Goodbye, ' + req.user.toString() + '!';
      req.flash('success', farewell);
      req.logout();
      if (req.is('json')) {
        res
          .status(200)
          .json({'code': 200, 'status': 'Ok', 'message': farewell});
      } else {
        res.redirect('back');
      }
    } else {
      if (req.is('json')) {
        core.errorResponses.error401(res);
      } else {
        res.redirect('back');
      }
    }
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

