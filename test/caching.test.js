'use strict';
/*jshint expr: true*/
var should = require('should'),
  async = require('async'),
  hunt = require('./../index.js'),
  request = require('request');


describe('Redis caching middleware', function () {
  var Hunt;
  before(function (done) {
    Hunt = hunt({
      'port': 3100,
      'disableCsrf': true
    });

    Hunt.extendRoutes(function (core) {
      core.app.use('/1sec', Hunt.cachingMiddleware(1000));
      core.app.all('*', function (req, res) {
        res.send('' + Date.now());
      });
    });

    Hunt.on('start', function (evnt) {
      done();
    });
    Hunt.startWebServer();
  });

  it('ignores POST, PUT, DELETE requests', function (done) {
    async.parallel({
      'PUT': function (cb) {
        request({'method': 'PUT', 'url': 'http://localhost:3100/1sec'}, function (error, response, body) {
          cb(error, body);
        });
      },
      'POST': function (cb) {
        request({'method': 'POST', 'url': 'http://localhost:3100/1sec'}, function (error, response, body) {
          cb(error, body);
        });
      },
      'DELETE': function (cb) {
        request({'method': 'DELETE', 'url': 'http://localhost:3100/1sec'}, function (error, response, body) {
          cb(error, body);
        });
      }
    }, function (error, obj) {
      if (error) {
        done(error);
      } else {
        Math.abs(parseInt(obj.PUT) - parseInt(obj.POST)).should.be.below(1000);
        Math.abs(parseInt(obj.PUT) - parseInt(obj.DELETE)).should.be.below(1000);
        done();
      }
    });
  });

  it('works ok for 1 sec', function (done) {
    async.parallel({
      'now': function (cb) {
        request({'method': 'GET', 'url': 'http://localhost:3100/1sec'}, function (error, response, body) {
          cb(error, body);
        });
      },
      '1sec': function (cb) {
        setTimeout(function () {
          request({'method': 'GET', 'url': 'http://localhost:3100/1sec'}, function (error, response, body) {
            cb(error, body);
          });
        }, 500);
      },
      '2sec': function (cb) {
        setTimeout(function () {
          request({'method': 'GET', 'url': 'http://localhost:3100/1sec'}, function (error, response, body) {
            cb(error, body);
          });
        }, 1500);
      }
    }, function (error, obj) {
      if (error) {
        done(error);
      } else {
        obj.now.should.be.equal(obj['1sec']);
        Math.abs(parseInt(obj['1sec']) - parseInt(obj['2sec'])).should.be.above(1000);
        done();
      }
    });
  });

  after(function (done) {
    Hunt.stop();
    done();
  });
});