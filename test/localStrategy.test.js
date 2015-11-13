'use strict';
/*jshint expr: true*/
var should = require('should'),
  request = require('request'),
  async = require('async'),
  hunt = require('./../index.js'),
  Hunt,
  huntKey,
  port = 3373;


describe('Local strategy test', function () {
  this.timeout(5000);
  //afterEach(function (done) {
  //  setTimeout(done, 1500);
  //});

  before(function (done) {
    Hunt = hunt({
      'port': port,
      'disableCsrf': true,
      'views': __dirname + '/views/hogan',
      'passport': {
        'local': true,
        'signUpByEmail': true,
        'verifyEmail': true,
        'verifyEmailTemplate': 'verifyEmail',
        'resetPasswordEmailTemplate': 'resetEmail',
        'resetPasswordPageTemplate': 'resetPassword',
        'resetPassword': true
      }
    });
    Hunt.once('start', function (payload) {
      payload.type.should.be.equal('webserver');
      payload.port.should.be.equal(port);
      should.not.exist(payload.error);
      Hunt.model.User.remove({}, done);
    });
    Hunt.startWebServer();
  });
//*/
  describe('trying to signup user by POST /auth/signup', function () {
    var
      r1, r2, r3, b1, b2, b3,
      evnt,
      welcomeLink;
    before(function (done) {
      Hunt.once('user:notify:email', function (emailOrdered) {
        evnt = emailOrdered;
        welcomeLink = evnt.user.keychain.welcomeLink;
        setTimeout(done, 500);
      });
      async.parallel({
        'doSignUp': function (cb) {
          request({
            'method': 'POST',
            'url': 'http://localhost:' + port + '/auth/signup',
            'form': {
              'username': 'spam2me',
              'email': 'spam2me@example.org',
              'password': 'someRealyStupidPassword'
            }
          }, function (err, response, body) {
            if (err) {
              cb(err);
            } else {
              r1 = response;
              b1 = body;

              request({
                'method': 'POST',
                'url': 'http://localhost:' + port + '/auth/isBusy',
                'form': {
                  'email': 'spam2me@example.org'
                }
              }, function (err, response, body) {
                if (err) {
                  cb(err);
                } else {
                  r2 = response;
                  b2 = body;
                  cb(null);
                }
              });
            }
          });
        },
        'doCheckDumpEmail': function (cb) {
          request({
            'method': 'POST',
            'url': 'http://localhost:' + port + '/auth/isBusy',
            'form': {
              'email': 'spam2me' + Math.floor(10000 * Math.random()) + '@example.org'
            }
          }, function (err, response, body) {
            if (err) {
              cb(err);
            } else {
              r3 = response;
              b3 = body;
              cb(null);
            }
          });
        }
      }, function (error) {
        if (error) {
          done(error);
        }
      });
    });

    it('have proper response for signing up', function () {
      r1.statusCode.should.be.equal(302);
    });

    it('have proper response for /auth/isBusy with email of existent user', function () {
      r2.statusCode.should.be.equal(200);
      b2 = JSON.parse(b2);
      b2.isBusy.should.be.true;
    });

    it('have proper response for /auth/isBusy with email of nonexistant user', function () {
      r3.statusCode.should.be.equal(200);
      b3 = JSON.parse(b3);
      b3.isBusy.should.be.false;
    });

    it('makes Hunt core emit event of notify:email with proper structure', function () {
      huntKey = evnt.user.huntKey;
      evnt.user.huntKey.should.be.a.String;
      evnt.user.username.should.be.equal('spam2me');
      evnt.user.keychain.email.should.be.equal('spam2me@example.org');
      evnt.user.accountVerified.should.be.false;
      evnt.user.gravatar100.should.be.equal('https://secure.gravatar.com/avatar/89b53b121018cf8f7b19c3bb97be675b.jpg?s=100&d=wavatar&r=g');
      evnt.user.gravatar80.should.be.equal('https://secure.gravatar.com/avatar/89b53b121018cf8f7b19c3bb97be675b.jpg?s=80&d=wavatar&r=g');
      evnt.user.gravatar50.should.be.equal('https://secure.gravatar.com/avatar/89b53b121018cf8f7b19c3bb97be675b.jpg?s=50&d=wavatar&r=g');
      evnt.user.gravatar30.should.be.equal('https://secure.gravatar.com/avatar/89b53b121018cf8f7b19c3bb97be675b.jpg?s=30&d=wavatar&r=g');
      evnt.user.gravatar.should.be.equal('https://secure.gravatar.com/avatar/89b53b121018cf8f7b19c3bb97be675b.jpg?s=80&d=wavatar&r=g');

      evnt.message.subject.should.be.equal('Email address verification');
      evnt.message.template.should.be.equal('verifyEmail');
      evnt.message.subject.should.be.equal('Email address verification');


      if (Hunt.config.hostUrl) {
        evnt.message.verifyUrl.should.be.equal(Hunt.config.hostUrl + 'auth/confirm/' + evnt.user.keychain.welcomeLink);
      } else {
        evnt.message.verifyUrl.should.be.equal('http://localhost:' + port + '/auth/confirm/' + evnt.user.keychain.welcomeLink);
      }

      evnt.message.layout.should.be.false;
    });

    it('allows to confirm users account', function (done) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/auth/confirm/' + welcomeLink
      }, function (err, response, body) {
        if (err) {
          done(err);
        } else {
          console.log(body);
          Hunt.model.User.findOneByHuntKey(huntKey, function (err1, userFound) {
            if (err1) {
              done(err1);
            } else {
              if (userFound) {
                userFound.accountVerified.should.be.true;
                userFound.remove(done);
              } else {
                done(new Error('Unable to confirm users account!'));
              }
            }
          });
        }
      });
    });
  });

  describe('trying to ask email for password reset by POST /auth/restoreAccount', function () {
    var
      evnt,
      welcomeLink,
      user;

    before(function (done) {
      Hunt.on('user:notify:email', function (emailOrdered) {
        evnt = emailOrdered;
        done();
      });

      async.waterfall([
        function (cb) {
          Hunt.model.User.signUp('donotspam2me', 'donotspam2me@example.org', 'iamcrocodile', cb);
        },
        function (userCreated, cb) {
          user = userCreated;
          request({
            'method': 'POST',
            'url': 'http://localhost:' + port + '/auth/restoreAccount',
            'form': {'email': 'donotspam2me@example.org'}
          }, cb);
        }
      ], function (err) {
        if (err) {
          done(err);
        }
      });
    });

    it('makes Hunt core emit event of notify:email with proper structure', function () {

      evnt.user.huntKey.should.be.a.String;
      evnt.user.username.should.be.equal('donotspam2me');
      evnt.user.keychain.email.should.be.equal('donotspam2me@example.org');
      evnt.user.accountVerified.should.be.false;
      evnt.user.gravatar100.should.be.equal('https://secure.gravatar.com/avatar/defb967f5f671fe278cf6d9b088b9686.jpg?s=100&d=wavatar&r=g');
      evnt.user.gravatar80.should.be.equal('https://secure.gravatar.com/avatar/defb967f5f671fe278cf6d9b088b9686.jpg?s=80&d=wavatar&r=g');
      evnt.user.gravatar50.should.be.equal('https://secure.gravatar.com/avatar/defb967f5f671fe278cf6d9b088b9686.jpg?s=50&d=wavatar&r=g');
      evnt.user.gravatar30.should.be.equal('https://secure.gravatar.com/avatar/defb967f5f671fe278cf6d9b088b9686.jpg?s=30&d=wavatar&r=g');
      evnt.user.gravatar.should.be.equal('https://secure.gravatar.com/avatar/defb967f5f671fe278cf6d9b088b9686.jpg?s=80&d=wavatar&r=g');

      evnt.message.subject.should.be.equal('Reset password');
      evnt.message.template.should.be.equal('resetEmail');
      evnt.message.resetUrl.should.be.equal('http://localhost:' + port + '/auth/reset/' + evnt.user.keychain.welcomeLink);
      welcomeLink = evnt.user.keychain.welcomeLink;
      //evnt.message.layout.should.be.false;
    });

    it('dissalows to follow bad welcome link', function (done) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/auth/reset/idi_na_hui_mydilo'
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(404);
          body.should.be.a.String;
          done();
        }
      });
    });

    it('allows to follow welcome link generated', function (done) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + port + '/auth/reset/' + welcomeLink
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          body.should.be.a.String;
          done();
        }
      });
    });

    it('allows to perform POST /auth/resetPassword for good values', function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + port + '/auth/resetPassword/',
        'form': {
          'welcomeLink': welcomeLink,
          'password': 'pray_to_God_and_eat_Meat'
        }
      }, done);
    });

    it('really changes the password to the new one', function (done) {
      Hunt.model.User.findById(user.id, function (error, userFound) {
        if (error) {
          done(error);
        } else {
          if (userFound) {
            userFound.password('pray_to_God_and_eat_Meat').should.be.true;
            userFound.password('iamcrocodile').should.be.false;
            done();
          } else {
            done(new Error('User is gone?'));
          }
        }
      });
    });

    after(function (done) {
      user.remove(done);
    });
  });
});
