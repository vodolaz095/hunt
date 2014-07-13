'use strict';
var async = require('async'),
  hunt = require('./../index.js'),
  Hunt;
require('should');

describe('Roles model', function () {
  before(function (done) {
    Hunt = hunt();
    Hunt.on('start', function () {
      done();
    });
    Hunt.startBackGround();
  });


  after(function (done) {
    Hunt.stop();
    done();
  });
});
