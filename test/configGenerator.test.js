'use strict';
/*jshint expr: true*/
var configGenerator = require('./../lib/misc/config.js'),
  should = require('should'),
  url = require('url');

describe('configGenerator', function () {

  describe('it should return proper object for empty config', function () {
    var config = configGenerator();
    it('set the enviroment properly', function () {
      config.env.should.be.equal(process.env.NODE_ENV || 'development');
    });
    it('set the port properly', function () {
      config.port.should.be.a.Number;
    });
    it('set the secret properly', function () {
      config.secret.should.be.a.String;
      (/[a-e0-9]{16,255}/.test(config.secret)).should.be.true;
    });

    it('set the hostUrl properly', function () {
      config.hostUrl.should.be.a.String;
      should.exist(url.parse(config.hostUrl));
    });
    it('set the redisUrl properly', function () {
      config.redisUrl.should.be.a.String;
      should.exist(url.parse(config.redisUrl));
    });
    it('set the mongoUrl properly', function () {
      config.mongoUrl.should.be.a.String;
      should.exist(url.parse(config.mongoUrl));
    });
    it('set the maxWorkers properly', function () {
      config.maxWorkers.should.be.a.Number;
      config.maxWorkers.should.be.below(17);
    });
    it('enables mongoose ORM by default', function () {
      config.enableMongoose.should.be.true;
    });
    it('enables hogan template engine by default', function () {
      config.templateEngine.should.be.equal('hogan');
    });
  });

  describe('it should return proper object for nonempty valid config', function () {
    var config = configGenerator({
      'secret': 'testlasaksdjhfjasfdjafdasfdgjh231313123',
      'hostUrl': 'http://somehost.com/',
      'redisUrl': 'redis://somehost.com:6379',
      'enableMongoose': false,
      'templateEngine': 'jade'
    });
    it('set the enviroment properly', function () {
      config.env.should.be.equal(process.env.NODE_ENV || 'development');
    });
    it('set the port properly', function () {
      config.port.should.be.a.Number;
    });
    it('set the secret properly', function () {
      config.secret.should.be.a.String;
      config.secret.should.be.equal('testlasaksdjhfjasfdjafdasfdgjh231313123');
    });

    it('set the hostUrl properly', function () {
      config.hostUrl.should.be.a.String;
      should.exist(url.parse(config.hostUrl));
      config.hostUrl.should.be.equal('http://somehost.com/');
    });
    it('set the redisUrl properly', function () {
      config.redisUrl.should.be.a.String;
      should.exist(url.parse(config.redisUrl));
      config.redisUrl.should.be.equal('redis://somehost.com:6379');
    });
    it('do not set the mongoUrl', function () {
      should.not.exist(config.mongoUrl);
    });
    it('set the maxWorkers properly', function () {
      config.maxWorkers.should.be.a.Number;
      config.maxWorkers.should.be.below(17);
    });

    it('disables mongoose ORM because of config value', function () {
      config.enableMongoose.should.be.false;
    });

    it('enables hogan template engine by default', function () {
      config.templateEngine.should.be.equal('jade');
    });


  });

  describe('it throws errors', function () {
    it('for wrong hostUrl', function () {
      (function () {
        configGenerator({
          'secret': 'testlasaksdjhfjasfdjafdasfdgjh231313123',
          'hostUrl': 'somehost.com',
          'redisUrl': 'redis://somehost.com:6379',
          'mongoUrl': 'mongodb://somehost.com/hunt_dev'
        });
      }).should.throw('Wrong hostUrl in config!');
    });

    it('for wrong redisUrl', function () {
      (function () {
        configGenerator({
          'secret': 'testlasaksdjhfjasfdjafdasfdgjh231313123',
          'hostUrl': 'http://somehost.com/',
          'redisUrl': 'somehost',
          'mongoUrl': 'mongodb://somehost.com/hunt_dev'
        });
      }).should.throw('Wrong redisUrl in config!');
    });

    it('for wrong mongoUrl', function () {
      (function () {
        configGenerator({
          'secret': 'testlasaksdjhfjasfdjafdasfdgjh231313123',
          'hostUrl': 'http://somehost.com/',
          'redisUrl': 'redis://somehost.com:6379',
          'mongoUrl': 'somehost.com'
        });
      }).should.throw('Wrong mongoUrl in config!');
    });

    it('for too short secret', function () {
      (function () {
        configGenerator({
          'secret': 'test',
          'hostUrl': 'http://somehost.com/',
          'redisUrl': 'redis://somehost.com:6379',
          'mongoUrl': 'mongodb://somehost.com/hunt_dev'
        });
      }).should.throw('Config.secret is to short!');
    });
  });
});
