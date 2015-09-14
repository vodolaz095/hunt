'use strict';
/*jshint expr: true*/
var hunt = require('./../index.js');

require('should');

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
      Hunt.extendCore({'some': 'shit'}, 'lalala');
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

describe('HuntJS builds clustered background application', function () {
  it('will be tested soon!');
});

describe('HuntJS builds clustered webserver application', function () {
  it('will be tested soon!');
});

