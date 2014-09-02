var hunt = require('hunt'),
  model = require('./model/article.model.js'),
  populateDb = require('./lib/populateDatabase.js'),
  should = require('should'),
  Hunt,
  request = require('request');

describe('Testing REST api as nobody', function () {
  before(function (done) {
    Hunt = hunt({
      'port': 3001,
      'disableCsrf': true,
      'huntKey': true,
      'mongoUrl': 'mongodb://localhost/hrw_dev'
    });

    Hunt.extendModel('Article', model);

    hrw(Hunt, { 'modelName': 'Article', 'methods': ['doSmth'], 'statics': 'doSmth'});

    Hunt.once('start', function (evnt) {
      populateDb(Hunt, done);
    });

    Hunt.startWebServer();
  });

  it('returns unauthorized for GET /', function (done) {
    request({
        'method': 'GET',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article',
        'json': true
      },
      function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(401);
          body.status.should.be.equal('Error');
          body.errors.should.be.an.Array;
          body.errors.length.should.be.equal(1);
          body.errors[0].code.should.be.equal(401);
          body.errors[0].message.should.be.equal('Authorization required!');
          done();
        }
      });
  });

  it('returns `This API endpoint do not exists!` for some stupid requests', function (done) {
    request({
        'method': 'POST',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/someStupidApiEndpointThatDoNotExists',
        'form': {
          'name': 'Da book',
          'content': 'some content'
        },
        'json': true
      },
      function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(404);
          body.status.should.be.equal('Error');
          body.errors.should.be.an.Array;
          body.errors.length.should.be.equal(1);
          body.errors[0].code.should.be.equal(404);
          body.errors[0].message.should.be.equal('This API endpoint do not exists!');
          done();
        }
      });
  });

  it('returns `Method not allowed` for POST /:id', function (done) {
    request({
        'method': 'POST',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/53b43aded6202872e0e3371f',
        'form': {
          'name': 'Da book',
          'content': 'some content'
        },
        'json': true
      },
      function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(405);
          body.status.should.be.equal('Error');
          body.errors.should.be.an.Array;
          body.errors.length.should.be.equal(1);
          body.errors[0].code.should.be.equal(405);
          body.errors[0].message.should.be.equal('Method not allowed!');
          done();
        }
      });
  });

  it('returns unauthorized for POST /', function (done) {
    request({
        'method': 'POST',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article',
        'form': {
          'name': 'Da book',
          'content': 'some content'
        },
        'json': true
      },
      function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(401);
          body.status.should.be.equal('Error');
          body.errors.should.be.an.Array;
          body.errors.length.should.be.equal(1);
          body.errors[0].code.should.be.equal(401);
          body.errors[0].message.should.be.equal('Authorization required!');
          done();
        }
      });
  });


  it('Allows to call existent static method', function (done) {
    request({
        'method': 'POST',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/method',
        'form': {
          'method': 'doSmth',
          'payload': 'Da book',
        },
        'json': true
      },
      function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(202);
          body.body.payload.should.be.equal('Da book');
          done();
        }
      });
  });


  it('Disallows to call non existent static method', function (done) {
    request({
        'method': 'POST',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/method',
        'form': {
          'method': 'doNotDoSmth',
          'payload': 'Da book',
        },
        'json': true
      },
      function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(404);
          body.status.should.be.equal('Error');
          body.errors.should.be.an.Array;
          body.errors.length.should.be.equal(1);
          body.errors[0].code.should.be.equal(404);
          body.errors[0].message.should.be.equal('Unknown static method!');
          done();
        }
      });
  });

  /*/
   it('returns unauthorized for PUT /:id',  function (done) {
   request({
   'method': 'PUT',
   'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/53b43aded6202872e0e3371f',
   'form': {
   'name': 'Da book',
   'content': 'some content'
   },
   'json': true
   },
   function (error, response, body) {
   if (error) {
   done(error);
   } else {
   response.statusCode.should.be.equal(401);
   body.status.should.be.equal('Error');
   body.errors.should.be.an.Array;
   body.errors.length.should.be.equal(1);
   body.errors[0].code.should.be.equal(401);
   body.errors[0].message.should.be.equal('Authorization required!');
   done();
   }
   });
   });
   //*/
  /*/
   it('returns unauthorized for DELETE /:id',  function (done) {
   request({
   'method': 'DELETE',
   'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/53b43aded6202872e0e3371f',
   'json': true
   },
   function (error, response, body) {
   if (error) {
   done(error);
   } else {
   response.statusCode.should.be.equal(401);
   body.status.should.be.equal('Error');
   body.errors.should.be.an.Array;
   body.errors.length.should.be.equal(1);
   body.errors[0].code.should.be.equal(401);
   body.errors[0].message.should.be.equal('Authorization required!');
   done();
   }
   });
   });
   //*/
});