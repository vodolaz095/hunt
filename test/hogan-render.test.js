'use strict';
/*jshint expr: true*/
var should = require('should'),
  async = require('async'),
  hunt = require('./../index.js'),
  request = require('request');


describe('Rendering with hogan', function () {
  var Hunt;
  before(function (done) {
    Hunt = hunt({
      'enableMongoose': false,
      'views': __dirname + '/hogan-views' //directory for templates
    });


    Hunt.extendApp(function (core) {
      core.app.locals.viewEngine = 'hogan';//http://expressjs.com/api.html#app.locals
    });

    Hunt.extendRoutes(function (core) {
      core.app.get('/', function (req, res) {
        res.render('index', {
          'text': 'index'
        });
      });

      core.app.get('/withOutLayout', function (req, res) {
        res.render('index', {
          'layout': false,
          'text': 'index'
        });
      });

      core.app.get('/withLayout2', function (req, res) {
        res.render('index', {
          'layout': 'layout2',
          'text': 'index'
        });
      });

      core.app.get('/withPartials', function (req, res) {
        res.render('index', {
          'partials': { testPartial: '_partial' },
          'text': 'index'
        });
      });
    });
    Hunt.on('start', function (evnt) {
      done();
    });
    Hunt.startWebServer(3003);
  });


  describe('it works', function () {
    var pagesRendered;
    before(function (done) {
      async.parallel({
        'default': function (cb) {
          Hunt.app.render('index', {text: 'index'}, cb);
        },
        'withoutLayout': function (cb) {
          Hunt.app.render('index', {text: 'index', layout: false}, cb);
        },
        'withLayout2': function (cb) {
          Hunt.app.render('index', {text: 'index', layout: 'layout2'}, cb);
        },
        'withPartials': function (cb) {
          Hunt.app.render('index', {text: 'index', partials: { testPartial: '_partial'} }, cb);
        }
      }, function (err, object) {
        if (err) {
          throw err;
        }
        pagesRendered = object;
        done();
      });
    });

    describe('it can be used by Hunt.app.render', function () {
      it('exposes the Hunt.app.render function', function () {
        Hunt.app.render.should.be.a.Function;
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
      var pagesRendered;
      before(function (done) {
        async.parallel({
          'default': function (cb) {
            request.get('http://localhost:3003/', function (err, res, body) {
              cb(err, body);
            });
          },
          'withoutLayout': function (cb) {
            request.get('http://localhost:3003/withOutLayout', function (err, res, body) {
              cb(err, body);
            });
          },
          'withLayout2': function (cb) {
            request.get('http://localhost:3003/withLayout2', function (err, res, body) {
              cb(err, body);
            });
          },
          'withPartials': function (cb) {
            request.get('http://localhost:3003/withPartials', function (err, res, body) {
              cb(err, body);
            });
          }
        }, function (err, object) {
          if (err) {
            throw err;
          }
          pagesRendered = object;
          done();
        });
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
  });

  after(function (done) {
    Hunt.stop();
    done();
  });
});
