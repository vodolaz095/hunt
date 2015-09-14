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
      'huntKey': true,
      'huntKeyHeader': true,
      'disableCsrf': true,
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

//setting controller for testing caching
    hunt.extendController('/1sec', function (core, router) {
      router.use('/', Hunt.cachingMiddleware(1000));
      router.all('*', function (req, res) {
        res.send('' + Date.now());
      });
    });

//setting route for testing huntKey
    hunt.extendController('/huntKey', function (core, router) {
      router.all('*', function (req, res) {
        if (req.user) {
          res.status(200).send(req.user.id);
        } else {
          res.status(403).send('Forbidden');
        }
      });
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
    hunt.extendController('/jade', function (core, router) {
      router.get('/', function (req, res) {
        var users = [{'name': 'Anatolij Ostroumov', 'email': 'ostroumov095@gmail.com'}];
        res.render('users.jade', {'users': users});
      });
    });

    hunt.startWebServer();
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

  describe('caching middleware', function () {
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
  });

  describe('hogan.js templating engine', function () {
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

  describe('jade templating engine', function () {
    var whatWeNeed = '<!DOCTYPE html><html><head><title>Jade Example</title></head><body><h1>Users</h1><div id=\"users\"><div class=\"user\"><h2>Anatolij Ostroumov</h2><div class=\"email\">ostroumov095@gmail.com</div></div></div></body></html>';

    it('exposes the hunt.app.render function', function () {
      hunt.app.render.should.be.a.Function;
    });

    it('renders what we need via hunt.app.render', function (done) {
      var users = [{'name': 'Anatolij Ostroumov', 'email': 'ostroumov095@gmail.com'}];
      hunt.app.render('users.jade', {'users': users}, function (err, html) {
        if (err) {
          done(err);
        } else {
          html.should.be.equal(whatWeNeed);
          done();
        }
      });
    });

    it('renders what we need for webserver', function (done) {
      request.get('http://localhost:' + port + '/', function (err, res, body) {
        if (err) {
          done(err);
        } else {
          body.should.be.equal(whatWeNeed);
          done(null);
        }
      });
    });

  });

  describe('huntKey', function () {
    var user;
    before(function (done) {
      Hunt.model.User.create({}, function (err, userCreated) {
        user = userCreated;
        done(err);
      });
    });

    describe('works for GET request with valid huntKey', function () {
      var r, b;
      before(function (done) {
        request.get('http://localhost:' + port + '/huntKey?huntKey=' + user.huntKey, function (err, response, body) {
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
        request.post('http://localhost:' + port + '/huntKey', {form: {'huntKey': user.huntKey}}, function (err, response, body) {
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
            url: 'http://localhost:' + port + '/huntKey',
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
            url: 'http://localhost:' + port + '/huntKey',
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
          url: 'http://localhost:' + port + '/huntKey',
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
        request.get('http://localhost:' + port + '/huntKey?huntkey=iWannaEatMeat', function (err, response, body) {
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
        request.post('http://localhost:' + port + '/huntKey', {form: {'huntkey': 'iWannaEatMeat'}}, function (err, response, body) {
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
            url: 'http://localhost:' + port + '/huntKey',
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
            url: 'http://localhost:' + port + '/huntKey',
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
          url: 'http://localhost:' + port + '/huntKey',
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
      Hunt.model.user.remove({'_id': user._id}, done);
    });
  });
});
