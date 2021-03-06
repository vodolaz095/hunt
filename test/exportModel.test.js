'use strict';
/*jshint expr: true*/
var
  winston = require('winston'),
  hunt = require('./../index.js'),
  model = require('./model/article.model.js'),
  populateDb = require('./lib/populateDatabase.js'),
  should = require('should'),
  Hunt,
  request = require('request');

winston.level = 'error';

function isArticleForUser(a) {
  a.id.should.be.a.String;
  a.name.should.be.a.String;
  a.content.should.be.a.String;
}

function isArticleForRoot(a) {
  a.id.should.be.a.String;
  a.name.should.be.a.String;
  a.content.should.be.a.String;
  a.author.id.should.be.a.String;
}

describe('Testing REST api', function () {
  before(function (done) {
    Hunt = hunt({
      'port': 3609,
      'disableCsrf': true,
      'huntKeyHeader': true
    });
    Hunt.extendModel('Article', model);

    Hunt.exportModelToRest({'ownerId': 'author', 'modelName': 'Article', 'methods': ['doSmth'], 'statics': 'doSmth'});

    (function () {
      Hunt.exportModelToRest({'ownerId': 'author', 'modelName': 'Planet', 'methods': ['doSmth'], 'statics': 'doSmth'});
    }).should.throw('Hunt.exportModelToRest() - modelName is not defined or corresponding model (Planet) does not exist!');

    Hunt.once('start', function (payload) {
      payload.type.should.be.equal('webserver');
      payload.port.should.be.equal(3609);
      should.not.exist(payload.error);
      populateDb(Hunt, done);
    });

    Hunt.startWebServer();
  });
  describe('for nobody', function () {
    it('returns unauthorized for GET /', function (done) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article',
        'json': true
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(401);
          body.status.should.be.equal('Error');
          body.message.should.be.equal('Unauthorized');
          done();
        }
      });
    });

    it('returns `Not Implemented` for some stupid requests', function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/someStupidApiEndpointThatDoNotExists',
        'form': {
          'name': 'Da book',
          'content': 'some content'
        },
        'json': true
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(501);
          body.status.should.be.equal('Error');
          body.message.should.be.equal('Not Implemented');
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
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(401);
          body.status.should.be.equal('Error');
          body.message.should.be.equal('Unauthorized');
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
          'payload': 'Da book'
        },
        'json': true
      }, function (error, response, body) {
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
          'payload': 'Da book'
        },
        'json': true
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(404);
          body.status.should.be.equal('Error');
          body.message.should.be.equal('Unknown static method!');
          done();
        }
      });
    });

    it('returns unauthorized for PUT /:id', function (done) {
      request({
        'method': 'PUT',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/53b43aded6202872e0e3371f',
        'form': {
          'name': 'Da book',
          'content': 'some content'
        },
        'json': true
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(401);
          body.status.should.be.equal('Error');
          body.message.should.be.equal('Unauthorized');
          done();
        }
      });
    });

    it('returns unauthorized for DELETE /:id', function (done) {
      request({
        'method': 'DELETE',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/53b43aded6202872e0e3371f',
        'json': true
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(401);
          body.status.should.be.equal('Error');
          body.message.should.be.equal('Unauthorized');
          done();
        }
      });
    });
  });

  describe('for limited user', function () {
    var rootKey = 'i_am_prep',
      bookName = 'Da book' + Date.now(),
      articleId;
    it('returns list of articles for GET /', function (done) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article',
        'headers': {'huntKey': rootKey},
        'json': true
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          body.status.should.be.equal('Ok');
          body.data.should.be.an.Array;
          body.data.map(isArticleForUser);
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
          'content': 'some content'
        },
        'json': true
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(201);
          body.status.should.be.equal('Created');
          body.id.should.be.a.String;
          response.headers.location.should.be.equal('/api/v1/article/' + body.id);
          articleId = body.id;
          done();
        }
      });
    });

    it('returns article needed for GET /:id', function (done) {
      Hunt.once(['REST', 'Article', 'READ', articleId], function (evnt) {
        evnt.ip.should.be.equal('127.0.0.1');
        evnt.user.root.should.be.true;
        evnt.modelName.should.be.equal('Article');
        evnt.fieldsReadable.should.be.an.Array;
        evnt.fieldsReadable.should.containEql('id');
        evnt.fieldsReadable.should.containEql('content');
        evnt.fieldsReadable.should.containEql('name');
        done();
      });


      request({
        'method': 'GET',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/' + articleId,
        'headers': {'huntKey': rootKey},
        'json': true
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          body.status.should.be.equal('Ok');
          body.data.name.should.be.equal(bookName);
          body.data.content.should.be.equal('some content');
          body.data.id.should.be.a.equal(articleId);
          body.data.author.id.should.be.equal('54a6168aa027eb0326220518');
        }
      });
    });

    it('Updates content by PUT /:id', function (done) {
      request({
        'method': 'PUT',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/' + articleId,
        'headers': {'huntKey': rootKey},
        'form': {
          'name': 'fresh book name',
          'content': 'some new content'
        },
        'json': true
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          body.code.should.be.equal(200);
          body.status.should.be.equal('Updated');
          request({
            'method': 'GET',
            'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/' + articleId,
            'headers': {'huntKey': rootKey},
            'json': true
          }, function (error, response, body) {
            if (error) {
              done(error);
            } else {
              response.statusCode.should.be.equal(200);
              body.status.should.be.equal('Ok');
              body.data.name.should.be.equal('fresh book name');
              body.data.content.should.be.equal('some new content');
              body.data.id.should.be.a.equal(articleId);
              done();
            }
          });
        }
      });
    });

    it('Creates content with predefined ID by POST /:id', function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/561cb1003a95770500845521',
        'headers': {'huntKey': rootKey},
        'form': {
          'name': 'some new book',
          'content': 'some new content'
        },
        'json': true
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(201);
          body.code.should.be.equal(201);
          body.status.should.be.equal('Created');
          body.id.should.be.equal('561cb1003a95770500845521');
          request({
            'method': 'GET',
            'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/561cb1003a95770500845521',
            'headers': {'huntKey': rootKey},
            'json': true
          }, function (error, response, body) {
            if (error) {
              done(error);
            } else {
              response.statusCode.should.be.equal(200);
              body.status.should.be.equal('Ok');
              body.data.name.should.be.equal('some new book');
              body.data.content.should.be.equal('some new content');
              body.data.id.should.be.a.equal('561cb1003a95770500845521');
              Hunt.model.Article.remove({'_id': '561cb1003a95770500845521'}, done);
            }
          });
        }
      });
    });

    it('Fails to updates content by POST /:id because of conflict', function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/' + articleId,
        'headers': {'huntKey': rootKey},
        'form': {
          'content': 'some extra new content'
        },
        'json': true
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(409);
          body.code.should.be.equal(409);
          body.status.should.be.equal('Error');
          body.message.should.be.equal('Conflict');
          done();
        }
      });
    });

    it('returns `Not Implemented` for some stupid requests', function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/someStupidApiEndpointThatDoNotExists',
        'headers': {'huntKey': rootKey},
        'form': {
          'name': 'Da book',
          'content': 'some content'
        },
        'json': true
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(501);
          body.status.should.be.equal('Error');
          body.code.should.be.equal(501);
          body.message.should.be.equal('Not Implemented');
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
          'payload': 'Da book'
        },
        'json': true
      }, function (error, response, body) {
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
          'payload': 'Da book'
        },
        'json': true
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(404);
          body.status.should.be.equal('Error');
          body.code.should.be.equal(404);
          body.message.should.be.equal('Unknown static method!');
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
          'payload': 'Da book'
        },
        'json': true
      }, function (error, response, body) {
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
          'payload': 'Da book'
        },
        'json': true
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(404);
          body.status.should.be.equal('Error');
          body.code.should.be.equal(404);
          body.message.should.be.equal('Not Found');
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
          'payload': 'Da book'
        },
        'json': true
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(404);
          body.status.should.be.equal('Error');
          body.code.should.be.equal(404);
          body.message.should.be.equal('Unknown instance method!');
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
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          body.status.should.be.equal('Deleted');
          request({
            'method': 'GET',
            'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/' + articleId,
            'headers': {'huntKey': rootKey},
            'json': true
          }, function (error, response, body) {
            if (error) {
              done(error);
            } else {
              response.statusCode.should.be.equal(404);
              body.status.should.be.equal('Error');
              body.code.should.be.equal(404);
              body.message.should.be.equal('Not Found');
              done();
            }
          });
        }
      });
    });
  });

  describe('for root user', function () {
    var rootKey = 'i_am_root',
      bookName = 'Da book_' + Date.now(),
      articleId;
    it('returns list of articles for GET /', function (done) {
      request({
        'method': 'GET',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article',
        'headers': {'huntKey': rootKey},
        'json': true
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          body.code.should.be.equal(200);
          body.status.should.be.equal('Ok');
          body.data.should.be.an.Array;
          body.data.map(isArticleForRoot);
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
          'content': 'some content'
        },
        'json': true
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(201);
          body.code.should.be.equal(201);
          body.status.should.be.equal('Created');
          //body.data.name.should.be.equal(bookName);
          //body.data.content.should.be.equal('some content');
          body.id.should.be.a.String;
          response.headers.location.should.be.equal('/api/v1/article/' + body.id);
          articleId = body.id;
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
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          body.code.should.be.equal(200);
          body.status.should.be.equal('Ok');
          body.data.name.should.be.equal(bookName);
          body.data.content.should.be.equal('some content');
          body.data.id.should.be.a.equal(articleId);
          body.data.author.id.should.be.a.String;
          done();
        }
      });
    });

    it('Updates content by PATCH /:id', function (done) {
      Hunt.once(['REST', 'Article', 'UPDATE', articleId], function (evnt) {
        evnt.ip.should.be.equal('127.0.0.1');
        evnt.patch.content.new.should.be.equal('some new content');
        evnt.user.root.should.be.true;
        evnt.patch.content.old.should.be.a.String;
        done();
      });

      request({
        'method': 'PATCH',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/' + articleId,
        'headers': {'huntKey': rootKey},
        'form': {
          'content': 'some new content'
        },
        'json': true
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          body.code.should.be.equal(200);
          body.status.should.be.equal('Updated');
          request({
            'method': 'GET',
            'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/' + articleId,
            'headers': {'huntKey': rootKey},
            'json': true
          }, function (error, response, body) {
            if (error) {
              done(error);
            } else {
              response.statusCode.should.be.equal(200);
              body.code.should.be.equal(200);
              body.status.should.be.equal('Ok');
              body.data.name.should.be.equal(bookName);
              body.data.content.should.be.equal('some new content');
              body.data.id.should.be.a.equal(articleId);
              body.data.author.id.should.be.a.String;
            }
          });
        }
      });
    });

    it('Receives conflict error for updating content by POST /:id', function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/' + articleId,
        'headers': {'huntKey': rootKey},
        'form': {
          'content': 'some extra new content'
        },
        'json': true
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(409);
          body.status.should.be.equal('Error');
          body.code.should.be.equal(409);
          body.message.should.be.equal('Conflict');
          done();
        }
      });
    });

    it('Updates content by PUT /:id', function (done) {
      Hunt.once('REST:Article:UPDATE:' + articleId, function (evnt) {
        evnt.ip.should.be.equal('127.0.0.1');
        evnt.patch.content.new.should.be.equal('some new content');
        evnt.user.root.should.be.true;
        evnt.patch.content.old.should.be.a.String;
        done();
      });

      request({
        'method': 'PUT',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/' + articleId,
        'headers': {'huntKey': rootKey},
        'form': {
          'name': bookName,
          'content': 'some new content'
        },
        'json': true
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          body.code.should.be.equal(200);
          body.status.should.be.equal('Updated');
          request({
            'method': 'GET',
            'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/' + articleId,
            'headers': {'huntKey': rootKey},
            'json': true
          }, function (error, response, body) {
            if (error) {
              done(error);
            } else {
              response.statusCode.should.be.equal(200);
              body.code.should.be.equal(200);
              body.status.should.be.equal('Ok');
              body.data.name.should.be.equal(bookName);
              body.data.content.should.be.equal('some new content');
              body.data.id.should.be.a.equal(articleId);
            }
          });
        }
      });
    });

    it('returns `Not Implemented` for some stupid requests', function (done) {
      request({
        'method': 'POST',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/someStupidApiEndpointThatDoNotExists',
        'headers': {'huntKey': rootKey},
        'form': {
          'name': 'Da book',
          'content': 'some content'
        },
        'json': true
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(501);
          body.status.should.be.equal('Error');
          body.code.should.be.equal(501);
          body.message.should.be.equal('Not Implemented');
          done();
        }
      });
    });

    it('Allows to call existent static method', function (done) {
      Hunt.once('REST:Article:CALL_STATIC:doSmth', function (evnt) {
        evnt.ip.should.be.equal('127.0.0.1');
        evnt.payload.payload.should.be.equal('Da book');
        evnt.user.root.should.be.true;
        done();
      });

      request({
        'method': 'POST',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/method',
        'headers': {'huntKey': rootKey},
        'form': {
          'method': 'doSmth',
          'payload': 'Da book'
        },
        'json': true
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(202);
          body.body.payload.should.be.equal('Da book');
          body.user.id.should.be.a.String;
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
          'payload': 'Da book'
        },
        'json': true
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(404);
          body.status.should.be.equal('Error');
          body.code.should.be.equal(404);
          body.message.should.be.equal('Unknown static method!');
          done();
        }
      });
    });

    it('Allows to call existent instance method', function (done) {
      Hunt.once('REST:Article:CALL_METHOD:' + articleId + ':doSmth', function (evnt) {
        evnt.ip.should.be.equal('127.0.0.1');
        evnt.payload.payload.should.be.equal('Da book');
        evnt.user.root.should.be.true;
        done();
      });

      request({
        'method': 'POST',
        'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/' + articleId + '/method',
        'headers': {'huntKey': rootKey},
        'form': {
          'method': 'doSmth',
          'payload': 'Da book'
        },
        'json': true
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(202);
          body.body.payload.should.be.equal('Da book');
          body.user.id.should.be.a.String;
          body.article._id.should.be.equal(articleId);
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
          'payload': 'Da book'
        },
        'json': true
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(404);
          body.status.should.be.equal('Error');
          body.code.should.be.equal(404);
          body.message.should.be.equal('Unknown instance method!');
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
          'payload': 'Da book'
        },
        'json': true
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(404);
          body.status.should.be.equal('Error');
          body.code.should.be.equal(404);
          body.message.should.be.equal('Not Found');
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
      }, function (error, response, body) {
        if (error) {
          done(error);
        } else {
          response.statusCode.should.be.equal(200);
          body.status.should.be.equal('Deleted');
          request({
            'method': 'GET',
            'url': 'http://localhost:' + Hunt.config.port + '/api/v1/article/' + articleId,
            'headers': {'huntKey': rootKey},
            'json': true
          }, function (error, response, body) {
            if (error) {
              done(error);
            } else {
              response.statusCode.should.be.equal(404);
              body.status.should.be.equal('Error');
              body.code.should.be.equal(404);
              body.message.should.be.equal('Not Found');
              done();
            }
          });
        }
      });
    });
  });
});