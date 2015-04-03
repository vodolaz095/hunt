'use strict';
var should = require('should'),
  request = require('request'),
  async = require('async'),
  hunt = require('./../index.js'),
  Hunt,
  huntKey,
  port = 3373;


describe('Local strategy test', function () {
  afterEach(function (done) {
    setTimeout(done, 1500);
  });

  before(function (done) {
    Hunt = hunt({
      'port': port,
      'disableCsrf': true,
      'views': __dirname + '/hogan-views',
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
    Hunt.on('start', function () {
      done();
    });
    Hunt.startWebServer();
  });

  describe('trying to signup user by POST /auth/signup', function () {
    var r1, r2, r3, b1, b2, b3, evnt;
    before(function (done) {
      Hunt.once('user:notify:email:*', function (emailOrdered) {
        evnt = emailOrdered;
        setTimeout(done, 500);
      });
      async.parallel({
        'doSignUp': function (cb) {
          request({
            'method': 'POST',
            'url': 'http://localhost:' + port + '/auth/signup',
            'form': {
              'email': 'spam2me@example.org',
              'password': 'someRealyStupidPassword'
            }
          }, function (err, response, body) {
            if (err) {
              cb(err);
            } else {
              r1 = response;
              b1 = body;

              request(
                {
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
            }
          );
        }
      }, function (err) {
        if (err) {
          throw err;
        }
      });
    });

    it('have proper response for signing up', function () {
      r1.statusCode.should.be.equal(302);
    });

    it('have proper response for /auth/isBusy with email of existant user', function () {
      r2.statusCode.should.be.equal(200);
      b2 = JSON.parse(b2);
      b2.isBusy.should.be.true;
    });

    it('have proper response for /auth/isBusy with email of nonexistant user', function () {
      r3.statusCode.should.be.equal(200);
      b3 = JSON.parse(b3);
      b3.isBusy.should.be.false;
    });

    var welcomeLink;
    it('makes Hunt core emit event of notify:email with proper structure', function () {
      huntKey = evnt.user.huntKey;
      welcomeLink = evnt.user.keychain.welcomeLink;
      evnt.user.huntKey.should.be.a.String;
      evnt.user.displayName.should.be.equal('spam2me');
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
      evnt.message.verifyUrl.should.be.equal('http://localhost:' + port + '/auth/confirm/' + evnt.user.keychain.welcomeLink);
      //evnt.message.layout.should.be.false;
    });

    after(function (done) {
      request('http://localhost:' + port + '/auth/confirm/' + welcomeLink, function (err, response, body) {
        if (err) {
          done(err);
        } else {
          Hunt.model.User.findOneByHuntKey(huntKey, function (err1, userFound) {
            if (err1) {
              done(err1);
            } else {
              if(userFound){
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
    var evnt,
      user;

    before(function (done) {
      Hunt.on('user:notify:email', function (emailOrdered) {
        evnt = emailOrdered;
        done();
      });

      async.waterfall([
        function (cb) {
          Hunt.model.User.signUp('donotspam2me@example.org', 'iamcrocodile', cb);
        },
        function (userCreated, cb) {
          user = userCreated;
          request({
            'method': 'POST',
            'url': 'http://localhost:' + port + '/auth/restoreAccount',
            'form': { 'email': 'donotspam2me@example.org' }
          }, cb);
        }
      ], function (err) {
        if (err) throw err;
      });

    });

    it('makes Hunt core emit event of notify:email with proper structure', function () {

      evnt.user.huntKey.should.be.a.String;
      evnt.user.displayName.should.be.equal('donotspam2me');
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
      //evnt.message.layout.should.be.false;
    });

    after(function (done) {
      user.remove(done);
    });

  });

  describe('Performing POST /auth/resetPassword', function () {
    it('will be done');
  });

});
