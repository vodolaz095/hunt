'use strict';
/*jshint expr: true*/
var
  Hunt = require('./../index.js'),
  should = require('should'),
  async = require('async'),
  request = require('request'),
  port = 2998;


describe('HuntJS application can run webserver', function () {
  var
    hunt,
    startEvent;
  before(function (done) {
    hunt = Hunt({
      'port': 2998,
      'views': __dirname + '/views'
    });
    hunt.on('start', function (payload) {
      startEvent = payload;
      done();
    });
//setting core value
    hunt.extendCore('someVar', 14);
//setting core func
    hunt.extendCore('someFunc', function (core) {
      return core.someVar;
    });
//setting app value
    hunt.extendApp(function (core) {
      core.app.set('someVar', core.someVar);
    });
//setting controller for testing template engines of hogan.js
    hunt.extendController('/hogan', function (core, router) {
      router.get('/', function (req, res) {
        res.render('hogan/index', {
          'layout': 'hogan/layout',
          'text': 'index'
        });
      });

      router.get('/withOutLayout', function (req, res) {
        res.render('hogan/index', {
          'layout': false,
          'text': 'index'
        });
      });

      router.get('/withLayout2', function (req, res) {
        res.render('hogan/index', {
          'layout': 'layout2',
          'text': 'index'
        });
      });

      router.get('/withPartials', function (req, res) {
        res.render('hogan/index', {
          'partials': {testPartial: '_partial'},
          'text': 'index'
        });
      });
    });
  });


  after(function (done) {
    hunt.stop();
    done();
  });

  it('emits proper `start` event', function () {
    startEvent.should.be.eql({'type': 'webserver', 'port': hunt.config.port, 'address': hunt.config.address});
  });

  it('have core extended properly with primitive value', function () {
    hunt.someVar.should.be.equal(14);
  });
  it('have core extended properly with function ', function () {
    hunt.someFunc().should.be.equal(14);
  });
  it('have express value set properly', function () {
    hunt.app.get('someVar').should.be.equal(14);
  });

  it('have redisClient', function () {
    hunt.redisClient.should.be.an.Object;
  });

  it('have createRedisClient', function () {
    hunt.createRedisClient.should.be.an.Function;
  });

  it('have models', function () {
    hunt.model.should.be.an.Object;
  });

  it('have User and Message models that looks like mongoose orm model', function () {
    ['User', 'Users', 'users', 'user', 'message', 'messages', 'Message'].map(function (name) {
      //maybe we need to extend this test in future
      hunt.model[name].should.be.a.Function;
      hunt.model[name].create.should.be.a.Function;
      hunt.model[name].find.should.be.a.Function;
      hunt.model[name].findOne.should.be.a.Function;
      hunt.model[name].remove.should.be.a.Function;
      hunt.model[name].findOneAndRemove.should.be.a.Function;
      hunt.model[name].findOneAndUpdate.should.be.a.Function;
      if (['User', 'Users', 'users', 'user'].indexOf(name) !== -1) {
        hunt.model[name].findOneByHuntKey.should.be.a.Function;
      }
      hunt.model[name].findById.should.be.a.Function;
    });
  });


  describe('testing hogan.js templating engine', function () {
    describe('it can be used by Hunt.app.render', function () {
      var pagesRendered;
      before(function (done) {
        async.parallel({
          'default': function (cb) {
            hunt.app.render('hogan/index', {text: 'index', layout: 'hogan/layout'}, cb);
          },
          'withoutLayout': function (cb) {
            hunt.app.render('hogan/index', {text: 'index', layout: false}, cb);
          },
          'withLayout2': function (cb) {
            hunt.app.render('hogan/index', {text: 'index', layout: 'hogan/layout2'}, cb);
          },
          'withPartials': function (cb) {
            hunt.app.render('hogan/index', {text: 'index', partials: {testPartial: 'hogan/_partial'}}, cb);
          }
        }, function (err, object) {
          if (err) {
            throw err;
          }
          pagesRendered = object;
          done();
        });
      });
      it('exposes the Hunt.app.render function', function () {
        hunt.app.render.should.be.a.Function;
      });

      it('renders with default layout properly with respect to locals', function () {
        pagesRendered.default.should.equal('<l>indexhogan</l>');
      });
      it('renders without layout properly with respect to locals', function () {
        pagesRendered.withoutLayout.should.equal('indexhogan');
      });
      it('renders with layout2 properly with respect to locals', function () {
        pagesRendered.withLayout2.should.equal('<l2>indexhogan</l2>');
      });
      it('renders with partials properly with respect to locals', function () {
        pagesRendered.withPartials.should.equal('<l>indexhoganpartial</l>');
      });
    });

    describe('it can be used for rendering static html pages for clients', function () {
      var pagesRenderedViaWebServer;
      before(function (done) {
        async.parallel({
          'default': function (cb) {
            request.get('http://localhost:' + port + '/', function (err, res, body) {
              cb(err, body);
            });
          },
          'withoutLayout': function (cb) {
            request.get('http://localhost:' + port + '/withOutLayout', function (err, res, body) {
              cb(err, body);
            });
          },
          'withLayout2': function (cb) {
            request.get('http://localhost:' + port + '/withLayout2', function (err, res, body) {
              cb(err, body);
            });
          },
          'withPartials': function (cb) {
            request.get('http://localhost:' + port + '/withPartials', function (err, res, body) {
              cb(err, body);
            });
          }
        }, function (err, object) {
          if (err) {
            throw err;
          }
          pagesRenderedViaWebServer = object;
          done();
        });
      });

      it('renders with default layout properly with respect to locals', function () {
        pagesRenderedViaWebServer.default.should.equal('<l>indexhogan</l>');
      });
      it('renders without layout properly with respect to locals', function () {
        pagesRenderedViaWebServer.withoutLayout.should.equal('indexhogan');
      });
      it('renders with layout2 properly with respect to locals', function () {
        pagesRenderedViaWebServer.withLayout2.should.equal('<l2>indexhogan</l2>');
      });
      it('renders with partials properly with respect to locals', function () {
        pagesRenderedViaWebServer.withPartials.should.equal('<l>indexhoganpartial</l>');
      });
    });
  });


});
