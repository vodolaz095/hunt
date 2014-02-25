'use strict';
module.exports = exports = function (core) {
  core.app.get('/api/dialog', function (request, response) {
    if (request.user) {
      var mesgLimit = request.query.limit ? request.query.limit : 10,
        mesgOffset = request.query.offset ? request.query.offset : 0;

      request.user.getRecentMessages(mesgLimit, mesgOffset, function (err, messages) {
        if (err) throw err;
        response.json(messages);
      });
    } else {
      response.send(403);
    }
  });

  core.app.get('/api/dialog/:id', function (request, response) {
    if (request.user) {
      var mesgLimit = request.query.limit ? request.query.limit : 10,
        mesgOffset = request.query.offset ? request.query.offset : 0;

      request.user.getDialog(request.params.id, mesgLimit, mesgOffset, function (err, messages) {
        if (err && err.message === 'User do not exists!') {
          response.send(404);
        } else {
          if (err) throw err;
          response.json(messages);
        }
      });
    } else {
      response.send(400);
    }
  });

  core.app.post('/api/dialog/:id', function (request, response) {
    if (request.user) {
      request.user.sendMessage(request.params.id, request.body.message, function (err) {
        if (err) throw err;
        if (request.get('Content-Type') === 'application/json') {
          response.json(201, {'status': 201, 'description': 'Message is send!'});
        } else {
          response.redirect('back');
        }
      });
    } else {
      response.send(400);
    }
  });
};
