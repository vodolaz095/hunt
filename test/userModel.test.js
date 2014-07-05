'use strict';
var should = require('should'),
  async = require('async'),
  hunt = require('./../index.js'),
  Hunt;

describe('Users model', function () {
  before(function (done) {
    Hunt = hunt();
    Hunt.on('start', function () {
      done();
    });
    Hunt.startBackGround();
  });

  describe('Users model', function () {
    describe('Testing Hunt mongoose model of users:', function () {
      describe('it has proper functions', function () {
        it('exposes function find', function () {
          Hunt.model.User.find.should.be.a.Function;
        });
        it('exposes function findOne', function () {
          Hunt.model.User.findOne.should.be.a.Function;
        });
        it('exposes function findOneByEmail', function () {
          Hunt.model.User.findOneByEmail.should.be.a.Function;
        });
        it('exposes function findOneByHuntKey', function () {
          Hunt.model.User.findOneByHuntKey.should.be.a.Function;
        });
        it('exposes function count', function () {
          Hunt.model.User.count.should.be.a.Function;
        });
        it('exposes function remove', function () {
          Hunt.model.User.remove.should.be.a.Function;
        });
        it('exposes function create', function () {
          Hunt.model.User.create.should.be.a.Function;
        });
        it('exposes function signUp', function () {
          Hunt.model.User.signUp.should.be.a.Function;
        });
        it('exposes function findOneByHuntKeyAndVerifyEmail', function () {
          Hunt.model.User.findOneByHuntKeyAndVerifyEmail.should.be.a.Function;
        });
        it('exposes function findOneByHuntKeyAndResetPassword', function () {
          Hunt.model.User.findOneByHuntKeyAndResetPassword.should.be.a.Function;
        });

      });

      describe('finders', function () {
        var usersFound;
        before(function (done) {
          Hunt.model.User.create({
            'email': 'ostroumov4@teksi.ru',
            'huntKey': 'vseBydetHorosho'
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            async.parallel({
              'byEmail': function (cb) {
                Hunt.model.User.findOneByEmail('ostroumov4@teksi.ru', cb);
              },
              'byHuntKey': function (cb) {
                Hunt.model.User.findOneByHuntKey('vseBydetHorosho', cb);
              },
              'created': function (cb) {
                cb(null, userCreated);
              }
            }, function (err, res) {
              if (err) {
                throw err;
              }
              usersFound = res;
              done();
            });
          });
        });

        it('we created correct user to be sure', function () {
          usersFound.created.email.should.be.equal('ostroumov4@teksi.ru');
          usersFound.created.huntKey.should.be.equal('vseBydetHorosho');
        });

        it('findOneByHuntKey works', function () {
          usersFound.created._id.should.eql(usersFound.byHuntKey._id);
        });

        it('findOneByEmail works for Email', function () {
          usersFound.created._id.should.eql(usersFound.byEmail._id);
        });


        after(function (done) {
          usersFound.created.remove(done);
        });
      });

      describe('signUp', function () {
        var user;
        before(function (done) {
          Hunt.model.User.signUp('johndoe@example.org', 'waterfall', function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            done();
          });
        });

        it('creates user with desired email', function () {
          user.email.should.be.equal('johndoe@example.org');
        });

        it('creates user with LOOOONG salt and password', function () {
          user.salt.length.should.be.above(63);
          user.password.length.should.be.above(63);
        });

        it('creates user with desired password', function () {
          user.verifyPassword('waterfall').should.be.true;
          user.verifyPassword('fiflesAndFuffles').should.be.false;
        });

        it('creates user with huntKey present', function () {
          user.huntKey.length.should.be.above(63);
        });

        it('creates user with actual huntKey', function () {
          var ago = new Date().getTime() - user.huntKeyCreatedAt.getTime();
          ago.should.be.below(10 * 1000); //10 seconds
        });

        it('creates user with accountVerified being FALSE', function () {
          user.accountVerified.should.be.false;
        });

        it('creates ordinary user, not root', function () {
          user.root.should.be.false;
        });

        after(function (done) {
          user.remove(done);
        });
      });

      describe('findOneByHuntKeyAndVerifyEmail for correct huntKey', function () {
        var user, userBeingActivated;
        before(function (done) {
          Hunt.model.User.create({
            'email': 'oneByhuntKey@teksi.ru',
            'huntKey': 'vseBydetHoroshooneByhuntKey',
            'accountVerified': false
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            Hunt.model.User.findOneByHuntKeyAndVerifyEmail('vseBydetHoroshooneByhuntKey', function (err, userActivated) {
              userBeingActivated = userActivated;
              done();
            });
          });
        });

        it('it finds the user we created', function () {
          userBeingActivated._id.should.eql(user._id);
        });

        it('set accountVerified to TRUE', function () {
          userBeingActivated.accountVerified.should.be.true;
        });

        after(function (done) {
          user.remove(done);
        });
      });
      describe('findOneByHuntKeyAndVerifyEmail for wrong huntKey', function () {
        var user, userBeingActivated, errorThrown;
        before(function (done) {
          Hunt.model.User.create({
            'email': 'oneByhuntKey@teksi.ru',
            'huntKey': 'vseBydetHoroshooneByhuntKey',
            'accountVerified': false
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            Hunt.model.User.findOneByHuntKeyAndVerifyEmail('vseIdetPoPlanu', function (err, userActivated) {
              errorThrown = err;
              userBeingActivated = userActivated;
              done();
            });
          });
        });

        it('throws proper error', function () {
          errorThrown.should.be.an.instanceOf(Error);
          errorThrown.message.should.be.equal('Activation key is wrong or outdated!');
        });

        it('do NOT returns the user', function () {
          should.not.exists(userBeingActivated);
        });

        after(function (done) {
          user.remove(done);
        });
      });
      describe('findOneByHuntKeyAndVerifyEmail for outdated huntKey', function () {
        var user,
          userBeingActivated,
          errorThrown;
        before(function (done) {
          Hunt.model.User.create({
            'email': 'oneByhuntKey@teksi.ru',
            'huntKey': 'vseBydetHoroshooneByhuntKey',
            'accountVerified': false,
            'huntKeyCreatedAt': new Date(1986, 1, 12, 11, 45, 36, 21)
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            Hunt.model.User.findOneByHuntKeyAndVerifyEmail('vseBydetHoroshooneByhuntKey', function (err, userActivated) {
              errorThrown = err;
              userBeingActivated = userActivated;
              done();
            });
          });
        });

        it('throws proper error', function () {
          errorThrown.should.be.an.instanceOf(Error);
          errorThrown.message.should.be.equal('Activation key is wrong or outdated!');
        });

        it('do NOT returns the user', function () {
          should.not.exists(userBeingActivated);
        });

        after(function (done) {
          user.remove(done);
        });
      });
      describe('findOneByHuntKeyAndResetPassword for good api key', function () {
        var user, userWithPasswordReseted;
        before(function (done) {
          async.waterfall([

              function (cb) {
                Hunt.model.User.create({
                  'email': 'iForgotMyPassWordIamStupid@teksi.ru',
                  'huntKey': 'iForgotMyPassWordIamStupid1111',
                  'accountVerified': true,
                  'huntKeyCreatedAt': new Date()
                }, function (err, userCreated) {
                  if (err) {
                    throw err;
                  }
                  user = userCreated;
                  userCreated.setPassword('lalala', function (err) {
                    cb(err, userCreated);
                  });
                });
              },
              function (user1, cb) {
                Hunt.model.User.findOneByHuntKeyAndResetPassword('iForgotMyPassWordIamStupid1111', 'lalala2', function (err1, userChanged) {
                  if (err1) {
                    cb(err1);
                  } else {
                    cb(null, userChanged);
                  }
                });
              }
            ],
            function (err, userChanged2) {
              if (err) {
                throw err;
              }
              userWithPasswordReseted = userChanged2;
              done();
            });
        });

        it('it finds the user we created', function () {
          userWithPasswordReseted._id.should.eql(user._id);
        });

        it('and the user have new password', function () {
          userWithPasswordReseted.verifyPassword('lalala1').should.be.false;
          userWithPasswordReseted.verifyPassword('lalala2').should.be.true;
        });

        after(function (done) {
          user.remove(done);
        });
      });
      describe('findOneByHuntKeyAndResetPassword for bad api key', function () {
        var user, userNotFound, errorThrown;
        before(function (done) {
          Hunt.model.User.create({
            'username': 'iForgotMyPassWordIamStupid',
            'email': 'iForgotMyPassWordIamStupid@teksi.ru',
            'huntKey': 'iForgotMyPassWordIamStupid1111',
            'accountVerified': true,
            'huntKeyCreatedAt': new Date()
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            Hunt.model.User.findOneByHuntKeyAndResetPassword('thisIsNotCorrecthuntKey', 'lalala2', function (err1, userChanged) {
              errorThrown = err1;
              userNotFound = userChanged
              done();
            });
          });
        });

        it('throws proper error', function () {
          errorThrown.should.be.an.instanceOf(Error);
          errorThrown.message.should.be.equal('Activation key is wrong or outdated!');
        });

        it('do not returns user in callback', function () {
          should.not.exists(userNotFound);
        });

        after(function (done) {
          user.remove(done);
        });
      });
      describe('findOneByHuntKeyAndResetPassword for outdated api key', function () {
        var user, userNotFound, errorThrown;
        before(function (done) {
          Hunt.model.User.create({
            'username': 'iForgotMyPassWordIamStupid',
            'email': 'iForgotMyPassWordIamStupid@teksi.ru',
            'huntKey': 'iForgotMyPassWordIamStupid1111',
            'accountVerified': true,
            'huntKeyCreatedAt': new Date(1986, 1, 12, 11, 45, 36, 21)
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            Hunt.model.User.findOneByHuntKeyAndResetPassword('iForgotMyPassWordIamStupid1111', 'lalala2', function (err1, userChanged) {
              errorThrown = err1;
              userNotFound = userChanged
              done();
            });
          });
        });

        it('throws proper error', function () {
          errorThrown.should.be.an.instanceOf(Error);
          errorThrown.message.should.be.equal('Activation key is wrong or outdated!');
        });

        it('do not returns user in callback', function () {
          should.not.exists(userNotFound);
        });

        after(function (done) {
          user.remove(done);
        });
      });


      describe('keychain', function () {

        describe('findByKeychain', function () {
          var user, userFound;

          before(function (done) {
            Hunt.model.User.create({
              'email': 'ostroumov@teksi.ru',
              'keychain': {
                'github': 11111
              }
            }, function (err, userCreated) {
              if (err) {
                throw err;
              }
              user = userCreated;
              Hunt.model.User.findOneByKeychain('github', 11111, function (err, usr) {
                userFound = usr;
                done();
              });
            });
          });

          it('finds correct user', function () {
            userFound._id.should.eql(user._id);
          });

          after(function (done) {
            user.remove(done);
          });
        });

        describe('setKeyChain', function () {
          var user, userUpdated;

          before(function (done) {
            Hunt.model.User.create({
              'email': 'ostroumov@teksi.ru',
              'keychain': {
                'github': 11111
              }
            }, function (err, userCreated) {
              if (err) {
                throw err;
              }
              user = userCreated;
              user.setKeyChain('someProvider', 1, function (err2) {
                if (err2) {
                  throw err2;
                }
                Hunt.model.User.findOneByKeychain('someProvider', 1, function (err, usr) {
                  userUpdated = usr;
                  done();
                });
              });
            });

            it('finds correct user', function () {
              userUpdated._id.should.eql(user._id);
            });

            it('finds correct user', function () {
              userUpdated.keychain.github.should.be.equal(11111);
              userUpdated.keychain.someProvider.should.be.equal(1);
            });


            after(function (done) {
              user.remove(done);
            });
          });
        });

        describe('revokeKeyChain', function () {
          var user, userUpdated;

          before(function (done) {
            Hunt.model.User.create({
              'email': 'ostroumov@teksi.ru',
              'keychain': {
                'github': 11111,
                'someProvider': 1
              }
            }, function (err, userCreated) {
              if (err) {
                throw err;
              }
              user = userCreated;
              user.revokeKeyChain('someProvider', 1, function (err2) {
                if (err2) {
                  throw err2;
                }
                Hunt.model.User.findOneByKeychain('github', 11111, function (err, usr) {
                  userUpdated = usr;
                  done();
                });
              });
            });

            it('finds correct user', function () {
              userUpdated._id.should.eql(user._id);
            });

            it('finds correct user', function () {
              userUpdated.keychain.github.should.be.equal(11111);
              should.not.exist(userUpdated.keychain.someProvider);
            });


            after(function (done) {
              user.remove(done);
            });
          });
        });
      });
    });

    describe('Testing Hunt mongoose model one instance of user:', function () {
      describe('general function are callable', function () {
        var user;

        before(function (done) {
          Hunt.model.User.create({
            'email': 'ostroumov@teksi.ru'
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            done();
          });
        });

        it('user instance have correct values', function () {
          user.email.should.be.equal('ostroumov@teksi.ru');
          user._id.should.match(/[a-z0-9A-Z]+/);
          user.gravatar.should.equal('https://secure.gravatar.com/avatar/0713799ed54a48d222f068d538d68a70.jpg?s=80&d=wavatar&r=g');
          user.accountVerified.should.be.false;
          user.isBanned.should.be.false;
          user.root.should.be.false;
        });

        it('user instance have functions needed', function () {
          user.verifyPassword.should.be.a.Function;
          user.setPassword.should.be.a.Function;
          user.invalidateSession.should.be.a.Function;
          user.notify.should.be.a.Function;
          user.getGravatar.should.be.a.Function;
          user.hasGroup.should.be.a.Function;
          user.removeFromGroup.should.be.a.Function;
          user.inviteToGroup.should.be.a.Function;
        });

        it('user instance creates a proper gravatar url', function () {
          user.getGravatar().should.equal('https://secure.gravatar.com/avatar/0713799ed54a48d222f068d538d68a70.jpg?s=300&d=wavatar&r=g');
        });

        after(function (done) {
          user.remove(done);
        });
      });

      describe('functions setPassword, verifyPassword', function () {
        var user;
        before(function (done) {
          Hunt.model.User.create({
            'email': 'ostroumov3@teksi.ru'
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            user.setPassword('lalalaDaiMne3Ryblya', function (err) {
              if (err) {
                throw err;
              }
              done();
            });
          });
        });


        it('function verifyPassword returns true on correct password', function () {
          user.verifyPassword('lalalaDaiMne3Ryblya').should.equal(true);
        });

        it('function verifyPassword returns false on wrong password', function () {
          user.verifyPassword('sukapadla_Rozovi#Rassvet_SukePadle_DaliMnogoLet').should.equal(false);
        });

        after(function (done) {
          user.remove(done);
        });
      });

      describe('function invalidateSession', function () {
        var user, newhuntKey;
        before(function (done) {
          Hunt.model.User.create({
            'email': 'ostroumov_3@teksi.ru',
            'huntKey': 'lalalaDaiMne3Ryblya'
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            userCreated.invalidateSession(function (err2, huntKeySet) {
              if (err2) {
                throw err2;
              }
              newhuntKey = huntKeySet;
              Hunt.model.User.findOneByEmail('ostroumov_3@teksi.ru', function (err3, userFound) {
                if (err3) {
                  throw err3;
                }
                user = userFound;
                done();
              });
            });
          });
        });

        it('changes the huntKey', function () {
          var test = (user.huntKey === 'lalalaDaiMne3Ryblya');
          test.should.equal(false);
        });

        it('fires callback with new api key', function () {
          newhuntKey.should.be.equal(user.huntKey);
        });

        after(function (done) {
          user.remove(done);
        });
      });

      describe('function notify', function () {
        var user,
          messageObj;
        before(function (done) {
          Hunt.model.User.create({
            'email': 'ostroumov' + Math.floor(Math.random() * 100) + '@teksi.ru'
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;

            setTimeout(function () {
              user.notify('Hello!');
            }, 300);

            Hunt.on('notify:all', function (message) {
              messageObj = message;
              done();
            });
          });
        });

        it('makes Hunt core emit events with message created properly', function () {
          messageObj.user.should.eql(user);
          messageObj.message.should.be.equal('Hello!');
        });

        it('throws errors for empty arguments', function () {
          (function () {
            user.notify();
          }).should.throw('Function User.notify([channelNameString],messageObj) has wrong arguments!');
        });

        after(function (done) {
          user.remove(done);
        });
      });
    });
  });

  describe('user profile test', function () {
    var userId,
      user;

    before(function (done) {
      Hunt.model.User.create({'displayName': 'userWithProfile'},
        function (err, userCreated) {
          if (err) {
            done(err);
          } else {
            userCreated.profile = {'iHaveProfile': true};
            userId = userCreated._id;
            userCreated.save(done);
          }
        });
    });

    it('user have profile properly populated', function (done) {
      Hunt.model.User.findOne({'_id': userId}, function (err, userFound) {
        if (err) throw err;
        user = userFound;
        userFound.profile.should.be.an.Object;
        userFound.profile.iHaveProfile.should.be.true;
        done(err);
      });
    });
    after(function (done) {
      user.remove(done);
    });
  });

  after(function (done) {
    Hunt.stop();
    done();
  });
});
