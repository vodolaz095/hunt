'use strict';
var async = require('async'),
  hunt = require('./../index.js'),
  Hunt;
require('should');

describe('Group model', function () {
  before(function (done) {
    Hunt = hunt();
    Hunt.on('start', function () {
      done();
    });
    Hunt.startBackGround();
  });

  describe('Group test', function () {
    var user1,
      user2,
      group1,
      group2;

    before(function (done) {
      async.parallel([
        function (cb) {
          Hunt.model.User.create({email: 'somebodyForGroupTest1@example.org'}, function (err, userCreated) {
            user1 = userCreated;
            cb(err);
          });
        },
        function (cb) {
          Hunt.model.User.create({email: 'somebodyForGroupTest2@example.org'}, function (err, userCreated) {
            user2 = userCreated;
            cb(err);
          });
        },
        function (cb) {
          Hunt.model.Group.create({'name': 'testGroup1', /*'owner': user1._id, 'members':[user1._id]*/ }, function (err, groupCreated) {
            group1 = groupCreated;
            cb(err);
          });
        },
        function (cb) {
          Hunt.model.Group.create({'name': 'testGroup2'}, function (err, groupCreated) {
            group2 = groupCreated;
            cb(err);
          });
        }
      ], done);
    });

    describe('User is invited to non existant group', function () {
      var err;
      before(function (done) {
        user1.inviteToGroup('testGroup' + Math.floor(1000 * Math.random()),
          function (err1) {
            err = err1;
            done(null);
          });
      });

      it('Throws error properly', function () {
        err.should.be.a.Error;
        err.message.should.be.equal('Group do not exists!');
      });
    });


    describe('User is invited to existant group', function () {
      var isInGroup,
        isNotInGroup;

      before(function (done) {
        user1.inviteToGroup('testGroup1', function (err1) {
          if (err1) {
            throw err1;
          } else {
            async.parallel([
              function (cb) {
                user1.hasGroup('testGroup1', function (err, r) {
                  if (err) {
                    cb(err);
                  } else {
                    isInGroup = r;
                    cb(null);
                  }
                });
              },
              function (cb) {
                user2.hasGroup('testGroup1', function (err, r) {
                  if (err) {
                    cb(err);
                  } else {
                    isNotInGroup = r;
                    cb(null);
                  }
                });
              },
              function (cb) {
                Hunt.model.Group.findOne({'name': 'testGroup1'}, function (err, groupFound) {
                  group1 = groupFound;
                  cb(err);
                });
              }
            ], done);
          }
        });
      });


      it('user1 is member of testGroup1', function () {
        isInGroup.should.be.true;
      });

      it('user2 is NOT member of testGroup1', function () {
        isNotInGroup.should.be.false;
      });

      it('creates group properly', function () {
        group1.name.should.be.equal('testGroup1');
        group1.members.should.be.Array;
        group1.members.should.include(user1._id);
        group1.members.should.not.include(user2._id);
        group1.inviteToGroup.should.be.a.Function;
        group1.removeFromGroup.should.be.a.Function;
        group1.getMembers.should.be.a.Function;
        group1.broadcast.should.be.a.Function;
        group1.broadcastEmail.should.be.a.Function;
      });

      describe('populates the users groups properly for user invited', function () {
        var usr1, usr2;
        before(function (done) {
          async.parallel([
            function (cb) {
              Hunt.model.User.findOneByEmail('somebodyForGroupTest1@example.org', function (err, userFound) {
                usr1 = userFound;
                cb(err);
              });
            },
            function (cb) {
              Hunt.model.User.findOneByEmail('somebodyForGroupTest2@example.org', function (err, userFound) {
                usr2 = userFound;
                cb(err);
              });
            }
          ], done);
        });

        it('do populates the users groups properly for user invited', function () {
          usr1.groups.should.be.Array;
          usr1.groups.should.include(group1._id);
        });

        it('do not populates the users groups properly for user NOT invited', function () {
          usr2.groups.should.be.Array;
          usr2.groups.should.not.include(group1._id);
        });
      });

    });

    describe('User is banned from group', function () {
      var group, hasGroup, usr;
      before(function (done) {
        Hunt.model.User.findOneByEmail('somebodyForGroupTest1@example.org', function (err, userFound) {
          userFound.removeFromGroup('testGroup1', function (err) {
            if (err) throw err;
            Hunt.model.User.findOneByEmail(userFound.email, function (err1, userFound) {
              if (err1) throw err1;
              usr = userFound;
              async.parallel({
                  'group': function (cb) {
                    Hunt.model.Group.findByName('testGroup1', cb);
                  },
                  'hasGroup': function (cb) {
                    userFound.hasGroup('testGroup1', cb);
                  }
                }, function (err, data) {
                  group = data.group;
                  hasGroup = data.hasGroup;
                  done(err);
                }
              );
            });
          });
        });
      });

      it('do not have user\'s id in members', function () {
        group.members.should.be.Array;
        group.members.should.not.include(usr._id);
      });

      it('is removed from group properly', function () {
        hasGroup.should.be.false;
      });

    });

    after(function (done) {
      async.parallel(
        [
          function (cb) {
            Hunt.model.User.remove({'$or': [
              {'keychain.email': 'somebodyForGroupTest1@example.org'},
              {'keychain.email': 'somebodyForGroupTest2@example.org'}
            ]}, cb);
          },
          function (cb) {
            Hunt.model.Group.remove({'$or': [
              {'name': 'testGroup1'},
              {'name': 'testGroup2'}
            ]}, cb);
          }
        ], done);
    });

  });

  after(function (done) {
    Hunt.stop();
    done();
  });
});
