'use strict';

var LocalStrategy = require('passport-local').Strategy;

exports.strategy = function (core) {
  return new LocalStrategy(function (username, password, done) {
    return core.model.User.signIn(username, password, done);
  });
};

exports.routes = function (core, router) {
//route to login by POST username and email
  router.post('/login',
    core.passport.authenticate('local', {
      failureRedirect: '/auth/failure?strategy=local',
      successRedirect: '/auth/success?strategy=local',
      failureFlash: 'Wrong password!',
      successFlash: 'Welcome!'
    }));

  if (core.config.passport.signUpByEmail) {
//routes for signUp
    router.post('/isBusy', function (request, response) {
      request.model.User.findOneByEmail(request.body.email, function (err, userFound) {
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
                      'user':{
                        'id': user.id,
                        'huntKey':user.huntKey
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

  if (core.config.passport.resetPassword) {
//route to ask for password reset email
    router.post('/restoreAccount', function (request, response) {
      var message = 'Check your email address, we have send you instructions for restoring account';
      if (request.body.email && core.validator.isEmail(request.body.email)) {
        request.model.User.findOneByEmail(request.body.email, function (err, userFound) {
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
              })
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
            })
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
};
