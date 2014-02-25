'use strict';
var hunt = require('./../index.js'),
  should = require('should'),
  async = require('async'),
  events = require('events'),
  request = require('request');

describe('Testing Hunt event emiting system', function () {
  var Hunt = hunt(),
    error,
    message;

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


  before(function (done) {
    var promise = new events.EventEmitter();

    Hunt.on('error', function (err) {
      promise.emit('error', err);
      error = err;
      done();
    });

    Hunt.on('ping', function (msg) {
      promise.emit('success', msg);
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
