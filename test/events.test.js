'use strict';
/*jshint expr: true*/
var hunt = require('./../index.js'),
  should = require('should');

describe('Testing Hunt event emitting system', function () {
  var Hunt = hunt({
    'enableMongoose': false
  });

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
  Hunt.startBackGround();

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
