var hunt = require('./../index.js'),
  model = require('./model/article.model.js'),
  populateDb = require('./lib/populateDatabase.js'),
  should = require('should'),
  Hunt,
  rootKey = 'i_am_prep',
  articleId,
  bookName = 'Da book' + Date.now(),
  request = require('request');


function isArticle(a) {
  a.id.should.be.a.String;
  a.name.should.be.a.String;
  a.content.should.be.a.String;
  should.not.exists(a.author);
}


describe('Testing REST api as user', function () {
  before(function (done) {
    Hunt = hunt({
      'port': 3603,
      'disableCsrf': true,
      'huntKeyHeader': true,
      'mongoUrl': 'mongodb://localhost/hunt_dev'
    });

    Hunt.extendModel('Article', model);

    Hunt.exportModelToRest({ 'modelName': 'Article', 'methods': ['doSmth'], 'statics': 'doSmth'});

    Hunt.once('start', function (evnt) {
      populateDb(Hunt, done);
    });

    Hunt.startWebServer();
  });

  it('returns list of articles for GET /', function (done) {
    request({
        'method': 'GET',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article',
        'headers': {'huntKey': rootKey},
        'json': true
      },
      function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          body.status.should.be.equal('Ok');
          body.data.should.be.an.Array;
          body.data.map(isArticle);
          done();
        }
      });
  });

  it('creates article for POST /', function (done) {
    request({
        'method': 'POST',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article',
        'headers': {'huntKey': rootKey},
        'form': {
          'name': bookName,
          'content': 'some content',
        },
        'json': true
      },
      function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(201);
          body.status.should.be.equal('Ok');
          body.data.name.should.be.equal(bookName);
          body.data.content.should.be.equal('some content');
          body.data.id.should.be.a.String;
          response.headers.location.should.be.equal('/api/v1/article/' + body.data.id);
          articleId = body.data.id;
          done();
        }
      });
  });

  it('returns article needed for GET /:id', function (done) {
    request({
        'method': 'GET',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/' + articleId,
        'headers': {'huntKey': rootKey},
        'json': true
      },
      function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          body.status.should.be.equal('Ok');
          body.data.name.should.be.equal(bookName);
          body.data.content.should.be.equal('some content');
          body.data.id.should.be.a.equal(articleId);
          done();
        }
      });
  });

  it('Updates content by PUT /:id', function (done) {
    request({
        'method': 'PUT',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/' + articleId,
        'headers': {'huntKey': rootKey},
        'form': {
          'content': 'some new content'
        },
        'json': true
      },
      function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          body.status.should.be.equal('Ok');
          body.data.name.should.be.equal(bookName);
          body.data.content.should.be.equal('some new content');
          body.data.id.should.be.a.equal(articleId);
          request({
              'method': 'GET',
              'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/' + articleId,
              'headers': {'huntKey': rootKey},
              'json': true
            },
            function (error, response, body) {
              if (error) {
                done(error);
              } else {
                response.statusCode.should.be.equal(200);
                body.status.should.be.equal('Ok');
                body.data.name.should.be.equal(bookName);
                body.data.content.should.be.equal('some new content');
                body.data.id.should.be.a.equal(articleId);
                done();
              }
            });
        }
      });
  });

  it('Updates content by POST /:id', function (done) {
    request({
        'method': 'POST',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/' + articleId,
        'headers': {'huntKey': rootKey},
        'form': {
          'content': 'some extra new content'
        },
        'json': true
      },
      function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          body.status.should.be.equal('Ok');
          body.data.name.should.be.equal(bookName);
          body.data.content.should.be.equal('some extra new content');
          body.data.id.should.be.a.equal(articleId);
          request({
              'method': 'GET',
              'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/' + articleId,
              'headers': {'huntKey': rootKey},
              'json': true
            },
            function (error, response, body) {
              if (error) {
                done(error);
              } else {
                response.statusCode.should.be.equal(200);
                body.status.should.be.equal('Ok');
                body.data.name.should.be.equal(bookName);
                body.data.content.should.be.equal('some extra new content');
                body.data.id.should.be.a.equal(articleId);
                done();
              }
            });
        }
      });
  });

  it('returns `This API endpoint do not exists!` for some stupid requests', function (done) {
    request({
        'method': 'POST',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/someStupidApiEndpointThatDoNotExists',
        'headers': {'huntKey': rootKey},
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

  it('Allows to call existent static method', function (done) {
    request({
        'method': 'POST',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/method',
        'headers': {'huntKey': rootKey},
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
          body.user.id.should.be.a.String;
          done();
        }
      });
  });

  it('Disallows to call non existent static method', function (done) {
    request({
        'method': 'POST',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/method',
        'headers': {'huntKey': rootKey},
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

  it('Allows to call existent instance method', function (done) {
    request({
        'method': 'POST',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/' + articleId + '/method',
        'headers': {'huntKey': rootKey},
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
          body.user.id.should.be.a.String;
          body.article._id.should.be.equal(articleId);
          done();
        }
      });
  });

  it('Disallows to call method of non existent instance', function (done) {
    request({
        'method': 'POST',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/54a6168aa027eb0326220518/method',
        'headers': {'huntKey': rootKey},
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
          response.statusCode.should.be.equal(404);
          body.status.should.be.equal('Error');
          body.errors.should.be.an.Array;
          body.errors.length.should.be.equal(1);
          body.errors[0].code.should.be.equal(404);
          body.errors[0].message.should.be.equal('Not found!');
          done();
        }
      });
  });

  it('Disallows to call non existent instance method', function (done) {
    request({
        'method': 'POST',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/' + articleId + '/method',
        'headers': {'huntKey': rootKey},
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
          body.errors[0].message.should.be.equal('Unknown instance method!');
          done();
        }
      });
  });

  it('Allows to delete article by DELETE /:id', function (done) {
    request({
        'method': 'DELETE',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/' + articleId,
        'headers': {'huntKey': rootKey},
        'json': true
      },
      function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          body.status.should.be.equal('deleted');
          request({
              'method': 'GET',
              'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/' + articleId,
              'headers': {'huntKey': rootKey},
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
                body.errors[0].message.should.be.equal('Not found!');
                done();
              }
            });
        }
      });
  });
});