'use strict';
/*jshint expr: true*/
var
  port = 3004,
  hunt = require('./../index.js'),
  request = require('request'),
  should = require('should');

describe('Authorization by huntkey', function () {
  var Hunt,
    user;

  before(function (done) {
    Hunt = hunt({
      'disableCsrf': true,
      'huntKey': true,
      'huntKeyHeader': true
    });

    Hunt.extendRoutes(function (core) {
      core.app.all('*', function (req, res) {
        if (req.user) {
          res.status(200).send(req.user.id);
        } else {
          res.status(403).send('Forbidden');
        }
      });
    });
    Hunt.once('start', function (payload) {
      payload.type.should.be.equal('webserver');
      payload.port.should.be.equal(port);
      should.not.exist(payload.error);
      Hunt.model.User.create({}, function (err, userCreated) {
        user = userCreated;
        done(err);
      });
    });
    Hunt.startWebServer(3004);
  });


  describe('works for GET request with valid huntKey', function () {
    var r, b;
    before(function (done) {
      request.get('http://localhost:3004/?huntKey=' + user.huntKey, function (err, response, body) {
        r = response;
        b = body;
        done(err);
      });
    });

    it('and authorize user needed', function () {
      r.statusCode.should.be.equal(200);
      b.should.be.eql(user.id);
    });

    it('sets the cache-control:private header', function () {
      r.headers['cache-control'].should.be.equal('private');
    });
  });

  describe('works for POST request with valid huntKey', function () {
    var r, b;
    before(function (done) {
      request.post('http://localhost:3004/', {form: {'huntKey': user.huntKey}}, function (err, response, body) {
        r = response;
        b = body;
        done(err);
      });
    });

    it('and authorize user needed', function () {
      r.statusCode.should.be.equal(200);
      b.should.be.eql(user.id);
    });

    it('sets the cache-control:private header', function () {
      r.headers['cache-control'].should.be.equal('private');
    });
  });

  describe('works for PUT request with valid huntKey', function () {
    var r, b;
    before(function (done) {
      request({
          method: 'PUT',
          url: 'http://localhost:3004/',
          form: {
            'huntKey': user.huntKey
          }
        }, function (err, response, body) {
          r = response;
          b = body;
          done(err);
        }
      );
    });

    it('and authorize user needed', function () {
      r.statusCode.should.be.equal(200);
      b.should.be.eql(user.id);
    });

    it('sets the cache-control:private header', function () {
      r.headers['cache-control'].should.be.equal('private');
    });
  });

  describe('works for DELETE request with valid huntKey', function () {
    var r, b;
    before(function (done) {
      request({
          method: 'DELETE',
          url: 'http://localhost:3004/',
          form: {
            'huntKey': user.huntKey
          }
        }, function (err, response, body) {
          r = response;
          b = body;
          done(err);
        }
      );
    });

    it('and authorize user needed', function () {
      r.statusCode.should.be.equal(200);
      b.should.be.eql(user.id);
    });

    it('sets the cache-control:private header', function () {
      r.headers['cache-control'].should.be.equal('private');
    });
  });


  describe('works for custom header with valid huntKey', function () {
    var r, b;
    before(function (done) {
      request({
        method: 'GET',
        url: 'http://localhost:3004/',
        headers: {
          'huntKey': user.huntKey
        }
      }, function (err, response, body) {
        r = response;
        b = body;
        done(err);
      });
    });

    it('and authorize user needed', function () {
      r.statusCode.should.be.equal(200);
      b.should.be.eql(user.id);
    });

    it('sets the cache-control:private header', function () {
      r.headers['cache-control'].should.be.equal('private');
    });
  });

  describe('NOT works for GET request with invalid huntKey', function () {
    var r, b;
    before(function (done) {
      request.get('http://localhost:3004/?huntkey=iWannaEatMeat', function (err, response, body) {
        r = response;
        b = body;
        done(err);
      });
    });

    it('and fails to authorize user', function () {
      r.statusCode.should.be.equal(403);
      b.should.be.eql('Forbidden');
    });
  });

  describe('NOT works for POST request with invalid huntKey', function () {
    var r, b;
    before(function (done) {
      request.post('http://localhost:3004/', {form: {'huntkey': 'iWannaEatMeat'}}, function (err, response, body) {
        r = response;
        b = body;
        done(err);
      });
    });

    it('and fails to authorize user', function () {
      r.statusCode.should.be.equal(403);
      b.should.be.eql('Forbidden');
    });
  });

  describe('NOT works for PUT request with invalid huntKey', function () {
    var r, b;
    before(function (done) {
      request({
          method: 'PUT',
          url: 'http://localhost:3004/',
          form: {
            'huntKey': 'iWannaEatMeat'
          }
        }, function (err, response, body) {
          r = response;
          b = body;
          done(err);
        }
      );
    });

    it('and fails to authorize user', function () {
      r.statusCode.should.be.equal(403);
      b.should.be.eql('Forbidden');
    });
  });

  describe('NOT works for DELETE request with invalid huntKey', function () {
    var r, b;
    before(function (done) {
      request({
          method: 'DELETE',
          url: 'http://localhost:3004/',
          form: {
            'huntKey': 'iWannaEatMeat'
          }
        }, function (err, response, body) {
          r = response;
          b = body;
          done(err);
        }
      );
    });

    it('and fails to authorize user', function () {
      r.statusCode.should.be.equal(403);
      b.should.be.eql('Forbidden');
    });
  });


  describe('NOT works for custom header with invalid huntKey', function () {
    var r, b;
    before(function (done) {
      request({
        method: 'GET',
        url: 'http://localhost:3004/',
        headers: {
          'huntKey': 'iWannaEatMeat'
        }
      }, function (err, response, body) {
        r = response;
        b = body;
        done(err);
      });
    });

    it('and fails to authorize user', function () {
      r.statusCode.should.be.equal(403);
      b.should.be.eql('Forbidden');
    });
  });

  after(function (done) {
    Hunt.model.user.remove({'_id': user._id}, function (err) {
      Hunt.stop();
      done(err);
    });
  });
});