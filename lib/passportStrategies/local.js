'use strict';

var LocalStrategy = require('passport-local').Strategy;

exports.strategy = function (core) {
  return new LocalStrategy(
    function (email, password, done) {
      core.model.User.findOneByEmail(email, function (err, user) {
        if (err) {
          return done(err, false);
        }
        if (user) {
          if (user.verifyPassword(password)) {
            return done(null, user);
          } else {
            return done(null, false);
          }
        } else {
          return done(null, false);
        }
      });
    }
  );
};

exports.routes = function (core) {
//route to login by POST username and email
  core.app.post('/auth/login',
    core.passport.authenticate('local', {
      failureRedirect: '/auth/failure',
      successRedirect: '/auth/success',
      failureFlash: 'Wrong password!',
      successFlash: 'Welcome!'
    }));

  if (core.config.passport.signUpByEmail) {
//routes for signUp
    core.app.post('/auth/isBusy', function (request, response) {
      request.model.User.findOneByEmail(request.body.email, function (err, userFound) {
        response.jsonp({
          'isBusy': userFound ? true : false
        });
      });
    });

    core.app.post('/auth/signup', function (request, response) {
      if (request.body.email && request.body.password) {
        request.model.User.signUp(request.body.email, request.body.password,
          function (err, user) {
            if (user) {

//sending user email for account verification
              if (core.config.passport.verifyEmail) {
                request.flash('success', 'Thanks for signing up! Please, verify your email by following link in it!');

                user.notifyByEmail({
                  'subject': 'Email address verification',
                  'template': core.config.passport.verifyEmailTemplate,
                  'verifyUrl': core.config.hostUrl + 'auth/confirm/' + user.apiKey
                });
              } else {
                request.flash('success', 'Thanks for signing up!');
              }

//authorising this user after signing up
              request.login(user, function(err){
                if(err){
                  throw err;
                } else {
                  response.redirect('back');
                }
              });
            } else {
              request.flash('error', 'Error signing up! Probably the email address provided is in use.');
              response.redirect('back');
            }
          });
      } else {
        response.send(400);
      }
    });
  }

  if (core.config.passport.resetPassword) {
//route to ask for password reset email
    core.app.post('/auth/restoreAccount', function (request, response) {
      var message = 'Check your email address, we have send you instructions for restoring account';
      if (request.body.email) {
        request.model.User.findOneByEmail(request.body.email, function (err, userFound) {
          if (err) {
            throw err;
          }
          if (userFound) {
            userFound.invalidateSession(function (err) {
              if (err) {
                throw err;
              }
              userFound.notifyByEmail({
                'subject': 'Reset password',
                'template': core.config.passport.resetPasswordEmailTemplate,
                'resetUrl': core.config.hostUrl + 'auth/reset/' + userFound.apiKey
              });
            });
          }
          request.flash('success', message); //haha)
          response.redirect('back');
        });
      } else {
        response.send(400);
      }
    });
//route to render page with form to reset password
    core.app.get('/auth/reset/:apiKey', function (request, response) {
      if (request.user) {
        response.redirect('/');
      } else {
        request.model.User.findOneByApiKey(request.params.apiKey, function (err, userFound) {
          if (err) {
            throw err;
          } else {
            if (userFound) {
              console.log(userFound.apiKey);
              response.render('' + core.config.passport.resetPasswordPageTemplate, {
                'title': 'Reset your password',
                'description': 'Welcome back!',
                'apiKeyForReset': userFound.apiKey
              });
            } else {
              response.send(404);
            }
          }
        });
      }
    });

//route to reset password
    core.app.post('/auth/resetPassword', function (request, response) {
      if (request.body.apiKey && request.body.password) {
        request.model.User.findOneByApiKeyAndResetPassword(request.body.apiKey, request.body.password, function (err) {
          if (err) {
            request.flash('error', err.message);
          } else {
            request.flash('success', 'Thanks! Your password is reset!');
          }
          response.redirect('/');
        });
      } else {
        response.send(400, 'Wrong request! apiKey and password are missed!');
      }
    });
  }
};
