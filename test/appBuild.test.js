'use strict';
/*jshint expr: true*/
var hunt = require('./../index.js'),
  should = require('should'),
  async = require('async'),
  request = require('request');


describe('Hunt', function () {
  it('should be a function', function () {
    hunt.should.have.type('function');
  });
});

describe('Hunt resists when we want to extend it\' core in strange way', function () {
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
        return;
      }, 'lalala');
    }).should.throw(/^Unable\sto\sinject/);

  });
});


describe('Hunt builds single threaded background application', function () {

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
      startedType.should.be.eql({'type': 'background'});
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
});

describe('Hunt builds single threaded webserver application', function () {
  var Hunt = hunt(),
    startedType,
    response1,
    response2,
    response3;

  after(function (done) {
    Hunt.stop();
    done();
  });

  Hunt.extendCore('someVar', 42);
  Hunt.extendCore('someFunc', function (core) {
    return core.someVar;
  });
  Hunt.extendApp(function (core) {
    core.app.set('someVar', core.someVar);
  });
  Hunt.extendMiddleware(function (core) {
    return function (req, res, next) {
      res.setHeader('globMiddleware', core.someVar);
      next();
    };
  });
  Hunt.extendMiddleware('production', function (core) {
    return function (req, res, next) {
      res.setHeader('prodMiddleware', core.someVar);
      next();
    };
  });
  Hunt.extendMiddleware('development', function (core) {
    return function (req, res, next) {
      res.setHeader('devMiddleware', core.someVar);
      next();
    };
  });
  Hunt.extendMiddleware('development', '/somePath', function (core) {
    return function (req, res, next) {
      res.setHeader('devMiddleware1', core.someVar);
      next();
    };
  });
  Hunt.extendMiddleware('production', '/somePath', function (core) {
    return function (req, res, next) {
      res.setHeader('devMiddleware2', core.someVar);
      next();
    };
  });
  Hunt.extendRoutes(function (core) {
    core.app.get('/', function (req, res) {
      res.status(403).send('OK');
    });
    core.app.get('/somePath', function (req, res) {
      res.status(404).send('somePath');
    });
  });
  Hunt.extendController('/controller', function (core, router) {
    router.get('/', function (req, res) {
      res.send('Hello?');
    });
  });


  describe('Hunt emit events of `start`', function () {
    var httpEvent1;
    before(function (done) {
      Hunt.on('start', function (type) {
        startedType = type;
        async.series([
          function (cb) {
            Hunt.once('http:*', function (evnt) {
              httpEvent1 = evnt;
            });
            request.get(Hunt.config.hostUrl, function (err, response, body) {
              response1 = response;
              cb(err, response);
            });
          },
          function (cb) {
            request.get(Hunt.config.hostUrl + 'somePath', function (err, response, body) {
              response2 = response;
              cb(err, response);
            });
          },
          function (cb) {
            request.get(Hunt.config.hostUrl + 'controller', function (err, response, body) {
              response3 = response;
              cb(err, response);
            });
          }
        ], done);
      });

      Hunt.startWebServer();
    });

    it('emits proper `start` event', function () {
      startedType.should.be.eql({'type': 'webserver', 'port': Hunt.config.port, 'address': Hunt.config.address});
    });

    it('emits proper `http:success` event for route /', function () {
      //httpEvent1.should.be.equal(1);
      httpEvent1.startTime.should.be.instanceOf(Date);
      httpEvent1.duration.should.be.below(100);
      httpEvent1.statusCode.should.be.equal(403);
      httpEvent1.method.should.be.equal('GET');
      httpEvent1.ip.should.be.equal('127.0.0.1');
      httpEvent1.uri.should.be.equal('/');
      should.not.exist(httpEvent1.user);
    });

    it('has proper response for case 1', function () {
      response1.statusCode.should.be.equal(403);
      response1.body.should.be.equal('OK');
    });
    it('has proper response for case 2', function () {
      response2.statusCode.should.be.equal(404);
      response2.body.should.be.equal('somePath');
    });

    it('has proper response for case 3', function () {
      response3.statusCode.should.be.equal(200);
      response3.body.should.be.equal('Hello?');
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

    it('have User, Group,Message, GroupMessage model that looks like mongoose orm model', function () {
      ['User', 'Users', 'users', 'user', 'message', 'messages', 'Message'].map(function (name) {
        //maybe we need to extend this test in future
        Hunt.model[name].should.be.a.Function;
        Hunt.model[name].create.should.be.a.Function;
        Hunt.model[name].find.should.be.a.Function;
        Hunt.model[name].findOne.should.be.a.Function;
        Hunt.model[name].remove.should.be.a.Function;
        Hunt.model[name].findOneAndRemove.should.be.a.Function;
        Hunt.model[name].findOneAndUpdate.should.be.a.Function;
        if (['User', 'Users', 'users', 'user'].indexOf(name) !== -1) {
          Hunt.model[name].findOneByHuntKey.should.be.a.Function;
        }
        Hunt.model[name].findById.should.be.a.Function;
      });
    });
  });

  describe('it starts web server', function () {
    it('responds on / properly with respect to routes and middlewares', function () {
      response1.body.should.be.equal('OK');
      response1.headers.globmiddleware.should.be.equal('42');
      response1.headers.devmiddleware.should.be.equal('42');
      response1.headers['x-powered-by'].should.be.equal('Hunt v' + Hunt.version);
      should.not.exist(response1.headers.prodMiddleware);
      should.not.exist(response1.headers.devMiddleware1);
    });
    it('responds on /somePath properly with respect to routes and middlewares', function () {
      response2.body.should.be.equal('somePath');
      response2.headers.globmiddleware.should.be.equal('42');
      response2.headers.devmiddleware.should.be.equal('42');
      response2.headers.devmiddleware1.should.be.equal('42');
      response2.headers['x-powered-by'].should.be.equal('Hunt v' + Hunt.version);
      should.not.exist(response1.headers.prodMiddleware);
    });
  });
});

describe('Hunt builds clustered background application', function () {
  it('will be tested... somehow');
});

describe('Hunt builds clustered webserver application', function () {
  it('will be tested... somehow');
});

