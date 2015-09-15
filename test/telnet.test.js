'use strict';
/*jshint expr: true*/
var
  should = require('should'),
  net = require('net');


describe('HuntJS builds telnet server application', function () {
  var
    hunt,
    startEvent;

  before(function (done) {
    hunt = require('./../index.js')({
      'port': 3023
    });
    hunt.on('start', function (payload) {
      startEvent = payload;
      done();
    });
//setting core value
    hunt.extendCore('someVar', 14);
//setting core func
    hunt.extendCore('someFunc', function (core) {
      return core.someVar;
    });
    hunt.extendCore('someFuncRet', function (core) {
      return function () {
        return core.someVar;
      };
    });
    hunt.extendTelnet('dotest', function (core, client, payload) {
      if (payload.toString() === '123') {
        client.send('ok');
      } else {
        client.send('notOk');
      }
    });
    hunt.startTelnetServer();
  });
  after(function (done) {
    hunt.stop();
    done();
  });

  describe('`start` event', function () {
    it('has proper `type`', function () {
      startEvent.type.should.be.equal('telnet');
    });
    it('has proper `port`', function () {
      startEvent.port.should.be.equal(3023);
    });
  });

  describe('#extendCore', function () {
    it('works with primitive value', function () {
      hunt.someVar.should.be.equal(14);
    });
    it('works with function returned value', function () {
      hunt.someFunc.should.be.equal(14);
    });
    it('works with function', function () {
      var
        a = hunt.someFuncRet,
        r = a();
      a.should.be.a.Function();
      r.should.be.equal(14);
    });
  });

  describe('and interacts with redis', function () {
    it('#redisClient is a redis client object', function () {
      hunt.redisClient.should.be.an.Object;
    });

    it('#createRedisClient is a function', function () {
      hunt.createRedisClient.should.be.an.Function;
    });

    it('#redisClient profiling works', function (done) {
      hunt.once(['profiling', 'redis', '*'], function (event) {
        event.startedAt.should.be.a.Date;
        event.finishedAt.should.be.a.Date;
        event.duration.should.be.a.Number;
        (event.duration >= 0).should.be.true;
        event.driver.should.be.equal('redis');
        event.command.should.be.equal('info');
        event.query.should.be.equal('info ');
        should.not.exist(event.error);
        event.result.should.be.a.String;
        done();
      });

      hunt.redisClient.info(function (error, info) {
        if (error) {
          done(error);
        } else {
          info.should.be.a.String;
          console.log('Redis info');
        }
      });
    });
  });

  describe('#models', function () {
    it('to be a dictionary', function () {
      hunt.model.should.be.an.Object;
    });
    it('of User and Message that looks like mongoose orm model', function () {
      ['User', 'Users', 'users', 'user', 'message', 'messages', 'Message'].map(function (name) {
        //maybe we need to extend this test in future
        hunt.model[name].should.be.a.Function;
        hunt.model[name].create.should.be.a.Function;
        hunt.model[name].find.should.be.a.Function;
        hunt.model[name].findOne.should.be.a.Function;
        hunt.model[name].remove.should.be.a.Function;
        hunt.model[name].findOneAndRemove.should.be.a.Function;
        hunt.model[name].findOneAndUpdate.should.be.a.Function;
        if (['User', 'Users', 'users', 'user'].indexOf(name) !== -1) {
          hunt.model[name].findOneByHuntKey.should.be.a.Function;
        }
        hunt.model[name].findById.should.be.a.Function;
      });
    });
  });
//*/
  describe('#rack', function () {
    var hash1, hash2, hash3;

    it('is a function', function () {
      hunt.rack.should.be.a.Function;
    });
    it('returns random hash', function () {
      hash1 = hunt.rack();
      hash2 = hunt.rack();
      hash3 = hunt.rack();

      hash1.should.be.a.String;
      hash2.should.be.a.String;
      hash3.should.be.a.String;
    });

    it('returns different hashes', function () {
      hash1.should.not.be.eql(hash2);
    });
    it('returns more different hashes', function () {
      hash1.should.not.be.eql(hash3);
    });
  });

  describe('#encrypt', function () {
    it('is a function', function () {
      hunt.encrypt.should.be.a.Function;
    });
    it('works for defined secret', function () {
      hunt.encrypt('daiMne3Ryblya', 'lalala').should.be.equal('936129d16f1c66a5116e4df797c1eba8');
    });
  });

  describe('#decrypt', function () {
    it('is a function', function () {
      hunt.decrypt.should.be.a.Function;
    });
    it('works for defined secret', function () {
      hunt.decrypt('936129d16f1c66a5116e4df797c1eba8', 'lalala').should.be.equal('daiMne3Ryblya');
    });
    it('works somehow for secret value from config', function () {
      hunt.decrypt(hunt.encrypt('daiMne3Ryblya')).should.be.equal('daiMne3Ryblya');
    });
  });

  describe('and is working as native event emitter', function () {
    var error,
      message;
    before(function (done) {
      hunt.on('error', function (err) {
        error = err;
        done();
      });

      hunt.on('ping', function (msg) {
        message = msg;
        done();
      });

      setTimeout(function () {
        hunt.emit('ping', 'pong');
      }, 100);

    });
    it('#emit exists', function () {
      hunt.emit.should.be.type('function');
    });
    it('#on exists', function () {
      hunt.on.should.be.type('function');
    });
    it('#on works', function () {
      should.not.exist(error);
      message.should.be.equal('pong');
    });
  });

  describe('and is working as eventEmitter2', function () {
    var error,
      name,
      message;
    before(function (done) {

      hunt.on('error', function (err) {
        error = err;
        done();
      });

      hunt.on('ping:*', function (msg) {
        name = this.event.join(':');
        message = msg;
        done();
      });

      setTimeout(function () {
        hunt.emit(['ping', 'event2'], 'pong');
      }, 100);

    });

    it('event have proper name', function () {
      name.should.be.equal('ping:event2');
    });

    it('event have proper payload', function () {
      message.should.be.equal('pong');
    });

    it('emits and catches events by itself', function () {
      should.not.exist(error);
      message.should.be.equal('pong');
    });
  });

  describe('telnet server', function () {
    it('start listening on port defined', function (done) {
      var client = net.connect(3023, function () { //'connect' listener
        client.on('data', function (data) {
          console.log(data.toString());
        });
        done();
      });
    });
    it('responds with proper data');
    it('reacts on `doTest 123` properly');
    it('reacts on `doTest something` properly');
  });
});