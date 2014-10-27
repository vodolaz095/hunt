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
          response.status(201).json({'status': 201, 'description': 'Message is send!'});
        } else {
          response.redirect('back');
        }
      });
    } else {
      response.send(400);
    }
  });

  core.once('start', function(evnt){
    if(evnt.type === 'webserver' && core.io && core.io.sockets){
      core.io.sockets.on('connection', function (socket) {
        if (core.config.dialog && socket.handshake.user) {

//private messages issued by user
          socket.on('dialog', function (dialogMessage, callback) {
            socket.handshake.user.sendMessage(dialogMessage.to, dialogMessage.message,
              function (err, message) {
                if (err) {
                  callback({'error':err.message});
                } else {
                  callback({'success':message.id});
                }
              });
          });

//group chat messages issued by user
          socket.on('groupchat', function (groupMessage, callback) {
            socket.handshake.user.sendMessageToGroup(groupMessage.groupchat, groupMessage.message,
              function (err, message) {
                if (err) {
                  callback({'error':err.message});
                } else {
                  callback({'success':message.id});
                }
              });
          });
        }
      });
    }
  });
};
