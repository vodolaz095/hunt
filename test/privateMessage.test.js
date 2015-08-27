'use strict';
/*jshint expr: true*/
var should = require('should'),
  async = require('async'),
  request = require('request'),
  hunt = require('./../index.js'),
  port = 3374,
  Hunt;

describe('Private messages', function () {
  before(function (done) {
    Hunt = hunt({
      'port': port,
      'huntKey': true,
      'dialog': true,
      'hostUrl': 'http://localhost:' + port,
      'disableCsrf': true // NEVER DO IT!
    });
    Hunt.once('start', function () {
      done();
    });
    Hunt.startWebServer();
  });

  describe('private messages system', function () {
    var User1, User2;

    before(function (done) {
      async.parallel({
        'user1': function (cb) {
          Hunt.model.User.create({
            'displayName': 'testSpamer1'
          }, cb);
        },
        'user2': function (cb) {
          Hunt.model.User.create({
            'displayName': 'testSpamer2'
          }, cb);
        }
      }, function (err, obj) {
        if (err) {
          done(err);
        } else {
          User1 = obj.user1;
          User2 = obj.user2;
          done();
        }
      });
    });

    describe('creating messages from code', function () {
      var event1, event2;
      before(function (done) {
        async.series([
          function (cb) {
            Hunt.once('user:notify:pm', function (m) {
              event1 = m;
              cb();
            });
            User1.sendMessage(User2, 'test1', function (err, messageCreated) {
              if (err) {
                throw err;
              }
            });
          },
          function (cb) {
            Hunt.once('user:notify:pm', function (m) {
              event2 = m;
              cb();
            });
            User2.receiveMessage(User1, 'test2', function (err, messageCreated) {
              if (err) {
                throw err;
              }
            });
          }
        ], done);
      });

      describe('sendMessage event', function () {
        it('event is emitted once when user sends message', function () {
          should.exist(event1);
        });

        it('event have correct "from" field', function () {
          event1.from._id.should.be.eql(User1._id);
        });

        it('event have correct "user" field', function () {
          event1.user._id.should.be.eql(User2._id);
        });

        it('event have proper contents', function () {
          event1.message.should.be.equal('test1');
        });
      });

      describe('receiveMessage event', function () {
        it('event is emitted once when user sends message', function () {
          should.exist(event2);
        });

        it('event have correct "from" field', function () {
          event2.from._id.should.be.eql(User1._id);
        });

        it('event have correct "user" field', function () {
          event2.user._id.should.be.eql(User2._id);
        });

        it('event have proper contents', function () {
          event2.message.should.be.equal('test2');
        });
      });
    });

    describe('reading messages from code', function () {
      describe('getRecentMessages', function () {
        var recentMessages, errF;
        before(function (done) {
          User2.getRecentMessages(100, 0, function (err, messages) {
            errF = err;
            recentMessages = messages;
            done();
          });
        });

        it('fires callback without error', function () {
          should.not.exist(errF);
        });

        it('fires callback with recent messages', function () {
          recentMessages.should.be.instanceOf(Array);
          recentMessages.length.should.be.equal(2);


          recentMessages[1].message.should.be.equal('test1');
          recentMessages[1].to._id.should.be.eql(User2._id);
          recentMessages[1].from._id.should.be.eql(User1._id);

          recentMessages[0].message.should.be.equal('test2');
          recentMessages[0].to._id.should.be.eql(User2._id);
          recentMessages[0].from._id.should.be.eql(User1._id);

        });
      });

      describe('getDialog for string of huntKey', function () {
        var recentMessages, errF;
        before(function (done) {
          User2.getDialog(User1.huntKey, 100, 0, function (err, messages) {
            errF = err;
            recentMessages = messages;
            done();
          });
        });

        it('fires callback without error', function () {
          should.not.exist(errF);
        });

        it('fires callback with recent messages', function () {
          recentMessages.should.be.instanceOf(Array);
          recentMessages.length.should.be.equal(2);

          recentMessages[1].message.should.be.equal('test1');
          recentMessages[1].to._id.should.be.eql(User2._id);
          recentMessages[1].from._id.should.be.eql(User1._id);

          recentMessages[0].message.should.be.equal('test2');
          recentMessages[0].to._id.should.be.eql(User2._id);
          recentMessages[0].from._id.should.be.eql(User1._id);

        });
      });

      describe('getDialog for user object', function () {
        var recentMessages, errF;
        before(function (done) {
          User2.getDialog(User1, 100, 0, function (err, messages) {
            errF = err;
            recentMessages = messages;
            done();
          });
        });

        it('fires callback without error', function () {
          should.not.exist(errF);
        });

        it('fires callback with recent messages', function () {
          recentMessages.should.be.instanceOf(Array);
          recentMessages.length.should.be.equal(2);

          recentMessages[1].message.should.be.equal('test1');
          recentMessages[1].to._id.should.be.eql(User2._id);
          recentMessages[1].from._id.should.be.eql(User1._id);

          recentMessages[0].message.should.be.equal('test2');
          recentMessages[0].to._id.should.be.eql(User2._id);
          recentMessages[0].from._id.should.be.eql(User1._id);

        });
      });
    });

    describe('creating messages by http api', function () {
      describe('User1 sends message to User2 by post request', function () {
        var response, body, event;
        before(function (done) {
          Hunt.once('user:notify:pm', function (m) {
            event = m;
            setTimeout(done, 1000);
          });

          request({
              'url': 'http://localhost:' + port + '/api/dialog/' + User2.id,
              'method': 'POST',
              'json': {
                'huntKey': User1.huntKey, //authorize as User1
                'message': 'test3'
              }
            },
            function (err, r, b) {
              if (err) {
                throw err;
              }
              response = r;
              body = b;
            });
        });

        it('he receives proper response for it', function () {
          response.statusCode.should.be.equal(201);
          body.should.be.eql({'status': 201, 'description': 'Message is sent!'});
        });

        it('event is emitted once when user sends message', function () {
          should.exist(event);
        });
        it('event have correct "from" field', function () {
          event.from._id.should.be.eql(User1._id);
        });
        it('event have correct "user" field', function () {
          event.user._id.should.be.eql(User2._id);
        });
        it('event have proper contents', function () {
          event.message.should.be.equal('test3');
        });
      });

      describe('User2 recieves his recent messages', function () {
        var response, body;
        before(function (done) {
          request({
              'url': 'http://localhost:' + port + '/api/dialog?huntKey=' + User2.huntKey,
              'method': 'GET'
            },
            function (err, r, b) {
              if (err) {
                throw err;
              }
              response = r;
              body = b;
              done();
            });
        });

        it('he receives proper response for it', function () {
          response.statusCode.should.be.equal(200);
          var messages = JSON.parse(body);
          messages.should.be.instanceOf(Array);
          messages.length.should.be.equal(3);

          messages[0].to.id.should.be.eql(User2._id.toString());
          messages[0].to.displayName.should.be.eql(User2.displayName);
          messages[0].to.gravatar.should.be.eql(User2.gravatar);

          messages[0].from.id.should.be.eql(User1._id.toString());
          messages[0].from.displayName.should.be.eql(User1.displayName);
          messages[0].from.gravatar.should.be.eql(User1.gravatar);

          messages[0].message.should.be.equal('test3');
        });

      });

      describe('User2 recieves dialog with User1', function () {
        var response, body;
        before(function (done) {
          request({
              'url': 'http://localhost:' + port + '/api/dialog/' + User1.id + '?huntKey=' + User2.huntKey,
              'method': 'GET'
            },
            function (err, r, b) {
              if (err) {
                throw err;
              }
              response = r;
              body = b;
              done();
            });
        });

        it('he receives proper response for it', function () {
          response.statusCode.should.be.equal(200);
          var messages = JSON.parse(body);
          messages.should.be.instanceOf(Array);
          messages.length.should.be.equal(3);

          messages[2].to.id.should.be.eql(User2._id.toString());
          messages[2].to.displayName.should.be.eql(User2.displayName);
          messages[2].to.gravatar.should.be.eql(User2.gravatar);

          messages[2].from.id.should.be.eql(User1._id.toString());
          messages[2].from.displayName.should.be.eql(User1.displayName);
          messages[2].from.gravatar.should.be.eql(User1.gravatar);
          messages[2].message.should.be.equal('test1');
        });

      });
    });

    after(function (done) {
      async.parallel([
        function (cb) {
          User1.remove(cb);
        },
        function (cb) {
          User2.remove(cb);
        },
        function (cb) {
          Hunt.model.Message.remove({}, cb);
        },
        function (cb) {
          Hunt.model.Message.remove({'from': User2._id}, cb);
        }
      ], done);
    });
  });

  after(function (done) {
    Hunt.stop();
    done();
  });
});
