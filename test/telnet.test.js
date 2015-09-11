'use strict';
/*jshint expr: true*/
var hunt = require('./../index.js'),
  net = require('net');

require('should');

var Hunt = hunt({
  'enableMongoose': false,
  'port': 3023
});

Hunt.extendTelnet('dotest', function (core, client, payload) {
  if (payload.toString() === '123') {
    client.send('ok');
  } else {
    client.send('notOk');
  }
});


describe('Hunt builds telnet server application', function () {
  var startParameters;
  before(function (done) {
    Hunt.on('start', function (parameters) {
      startParameters = parameters;
      done();
    });
    Hunt.startTelnetServer();
  });

  it('emits event of `start` properly', function () {
    startParameters.type.should.be.equal('telnet');
    startParameters.port.should.be.equal(3023);
  });

  it('start listening on port defined', function (done) {
    var client = net.connect(3023, function () { //'connect' listener
      client.on('data', function (data) {
        console.log(data.toString());
      });

      done();
    });
  });

  after(function (done) {
    Hunt.stop();
    done();
  });
});