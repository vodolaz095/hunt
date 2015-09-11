'use strict';
/*jshint expr: true*/
var
  port = 3100,
  should = require('should'),
  async = require('async'),
  hunt = require('./../index.js'),
  request = require('request');


describe('Redis caching middleware', function () {
  var Hunt;
  before(function (done) {
    Hunt = hunt({
      'port': port,
      'disableCsrf': true
    });

    Hunt.extendRoutes(function (core) {
      core.app.use('/1sec', Hunt.cachingMiddleware(1000));
      core.app.all('*', function (req, res) {
        res.send('' + Date.now());
      });
    });

    Hunt.on('start', function (payload) {
      payload.type.should.be.equal('webserver');
      payload.port.should.be.equal(port);
      should.not.exist(payload.error);
      done();
    });
    Hunt.startWebServer();
  });

  it('ignores POST, PUT, DELETE requests', function (done) {
    async.parallel({
      'PUT': function (cb) {
        request({'method': 'PUT', 'url': 'http://localhost:' + port + '/1sec'}, function (error, response, body) {
          cb(error, body);
        });
      },
      'POST': function (cb) {
        request({'method': 'POST', 'url': 'http://localhost:' + port + '/1sec'}, function (error, response, body) {
          cb(error, body);
        });
      },
      'DELETE': function (cb) {
        request({'method': 'DELETE', 'url': 'http://localhost:' + port + '/1sec'}, function (error, response, body) {
          cb(error, body);
        });
      }
    }, function (error, obj) {
      if (error) {
        done(error);
      } else {
        Math.abs(parseInt(obj.PUT, 10) - parseInt(obj.POST, 10)).should.be.below(1000);
        Math.abs(parseInt(obj.PUT, 10) - parseInt(obj.DELETE, 10)).should.be.below(1000);
        done();
      }
    });
  });

  it('works ok for 1 sec', function (done) {
    async.parallel({
      'now': function (cb) {
        request({'method': 'GET', 'url': 'http://localhost:' + port + '/1sec'}, function (error, response, body) {
          cb(error, body);
        });
      },
      '1sec': function (cb) {
        setTimeout(function () {
          request({'method': 'GET', 'url': 'http://localhost:' + port + '/1sec'}, function (error, response, body) {
            cb(error, body);
          });
        }, 500);
      },
      '2sec': function (cb) {
        setTimeout(function () {
          request({'method': 'GET', 'url': 'http://localhost:' + port + '/1sec'}, function (error, response, body) {
            cb(error, body);
          });
        }, 1500);
      }
    }, function (error, obj) {
      if (error) {
        done(error);
      } else {
        obj.now.should.be.equal(obj['1sec']);
        Math.abs(parseInt(obj['1sec'], 10) - parseInt(obj['2sec'], 10)).should.be.above(1000);
        done();
      }
    });
  });

  after(function (done) {
    Hunt.stop();
    done();
  });
});