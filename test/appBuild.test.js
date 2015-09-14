'use strict';
/*jshint expr: true*/
var hunt = require('./../index.js'),
  should = require('should');


describe('HuntJS', function () {
  it('should be a function', function () {
    hunt.should.have.type('function');
  });
});

describe('HuntJS resists when we want to extend it\' core in strange way', function () {
  var Hunt = hunt();
  it('should throw error for every one of protected names we want to override by Hunt.extendCore', function () {
    [
      'app', 'http', 'rack', 'httpServer',
      'passport', 'model',
      'redisClient', 'createRedisClient',
      'mongoose', 'mongoConnection',
      'sequelize',
      'version',
      'io',
      'encrypt', 'decrypt',
      'sessionStorage',
      'on', 'off', 'once', 'emit', 'many', 'onAny', 'offAny', 'removeListener'
    ].map(function (name) {
        (function () {
          Hunt.extendCore(('' + name), 'someStupidValueToIrritateCoreExtender');
          console.log('Exception not thrown for "' + name + '"');
        }).should.throw('Unable to extend Hunt core. Field "' + name + '" already occupied!');
      });
  });

  it('should throw error when we extend core by non strings field name', function () {
    (function () {
      Hunt.extendCore({ 'some' : 'shit' }, 'lalala');
    }).should.throw(/^Unable\sto\sinject/);

    (function () {
      Hunt.extendCore(['some', 'shit'], 'lalala');
    }).should.throw(/^Unable\sto\sinject/);

    (function () {
      Hunt.extendCore(function () {

      }, 'lalala');
    }).should.throw(/^Unable\sto\sinject/);

  });
});

describe('HuntJS builds single threaded background application', function () {

  var Hunt = hunt(),
    startedType;

  before(function (done) {
    setTimeout(done, 200);
  });

  after(function (done) {
    Hunt.stop();
    done();
  });
  Hunt.extendCore('someVar', 42);
  Hunt.extendCore('someFunc', function (core) {
    return core.someVar;
  });

  describe('Hunt emit events of started', function () {
    before(function (done) {
      Hunt.on('start', function (type) {
        startedType = type;
        done();
      });
      Hunt.startBackGround();
    });

    it('emits proper `start` event', function () {
      startedType.should.be.eql({ 'type' : 'background' });
    });
  });

  describe('Hunt internals', function () {
    it('have redisClient', function () {
      Hunt.redisClient.should.be.an.Object;
    });
    it('have createRedisClient', function () {
      Hunt.createRedisClient.should.be.an.Function;
    });
    it('have models', function () {
      Hunt.model.should.be.an.Object;
    });

    it('have User model that looks like mongoose orm model', function () {
      ['User', 'Users', 'users', 'user'].map(function (name) {
        //maybe we need to extend this test in future
        Hunt.model[name].should.be.a.Function;
        Hunt.model[name].create.should.be.a.Function;
        Hunt.model[name].find.should.be.a.Function;
        Hunt.model[name].findOne.should.be.a.Function;
        Hunt.model[name].remove.should.be.a.Function;
        Hunt.model[name].findOneAndRemove.should.be.a.Function;
        Hunt.model[name].findOneAndUpdate.should.be.a.Function;
        Hunt.model[name].findOneByHuntKey.should.be.a.Function;
        Hunt.model[name].findById.should.be.a.Function;
      });
    });

    it('have Message model that looks like mongoose orm model', function () {
      ['Message', 'Messages', 'message', 'messages'].map(function (name) {
        //maybe we need to extend this test in future
        Hunt.model[name].should.be.a.Function;
        Hunt.model[name].create.should.be.a.Function;
        Hunt.model[name].find.should.be.a.Function;
        Hunt.model[name].findOne.should.be.a.Function;
        Hunt.model[name].remove.should.be.a.Function;
        Hunt.model[name].findOneAndRemove.should.be.a.Function;
        Hunt.model[name].findOneAndUpdate.should.be.a.Function;
        Hunt.model[name].findById.should.be.a.Function;
      });
    });
  });

  describe('Hunt.extendCore', function () {
    it('saves static value to hunt core', function () {
      Hunt.someVar.should.be.eql(42);
    });
    it('executes factory function to hunt core', function () {
      (Hunt.someFunc).should.be.eql(42);
    });
  });

  describe('Hunt.rack', function () {
    var hash1 = Hunt.rack(),
      hash2 = Hunt.rack(),
      hash3 = Hunt.rack();

    it('returns random hash', function () {
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

  describe('Hunt.encrypt and Hunt.decrypt', function () {
    it('Hunt.encrypt works for defined secret', function () {
      Hunt.encrypt('daiMne3Ryblya', 'lalala').should.be.equal('936129d16f1c66a5116e4df797c1eba8');
    });
    it('Hunt.decrypt works for defined secret', function () {
      Hunt.decrypt('936129d16f1c66a5116e4df797c1eba8', 'lalala').should.be.equal('daiMne3Ryblya');
    });
    it('works somehow for secret value from config', function () {
      Hunt.decrypt(Hunt.encrypt('daiMne3Ryblya')).should.be.equal('daiMne3Ryblya');
    });
  });

  describe('native event emitter test', function () {
    var error,
      message;
    before(function (done) {

      Hunt.on('error', function (err) {
        error = err;
        done();
      });

      Hunt.on('ping', function (msg) {
        message = msg;
        done();
      });

      setTimeout(function () {
        Hunt.emit('ping', 'pong');
      }, 100);

    });

    it('can emit and listen to events', function () {
      Hunt.emit.should.be.type('function');
      Hunt.on.should.be.type('function');
    });

    it('emits and catches events by itself', function () {
      should.not.exist(error);
      message.should.be.equal('pong');
    });
  });
  describe('eventEmitter2 test', function () {
    var error,
      name,
      message;
    before(function (done) {

      Hunt.on('error', function (err) {
        error = err;
        done();
      });

      Hunt.on('ping:*', function (msg) {
        console.log(this.event);
        name = this.event.join(':');
        message = msg;
        done();
      });

      setTimeout(function () {
        Hunt.emit(['ping', 'event2'], 'pong');
        //Hunt.emit('ping.event2', 'pong');
      }, 100);

    });

    it('event have proper name', function () {
      name.should.be.equal('ping:event2');
    });

    it('event have proper payload', function () {
      message.should.be.equal('pong');
    });

    it('can emit and listen to events', function () {
      Hunt.emit.should.be.type('function');
      Hunt.on.should.be.type('function');
    });

    it('emits and catches events by itself', function () {
      should.not.exist(error);
      message.should.be.equal('pong');
    });
  });

});

describe('HuntJS builds clustered background application', function () {
  it('will be tested... somehow');
});

describe('HuntJS builds clustered webserver application', function () {
  it('will be tested... somehow');
});

