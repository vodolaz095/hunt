'use strict';
var
  winston = require('winston'),
  ioServer = require('socket.io'),
  cookieParser = require('cookie-parser'),
  ioRedisAdapter = require('socket.io-redis');

module.exports = exports = function (core) {
  if (core.config.io.enabled !== true) {
    return false;
  }

  /**
   * @name Hunt#io
   * @description
   * Ready to use {@link http://socket.io } object with passport.js integration
   */
  var
    io = ioServer(core.httpServer, core.config.io);

  io.adapter(ioRedisAdapter({
    pubClient: core.createRedisClient(), //it works in pub mode, it cannot access database
    subClient: core.createRedisClient() //it works in sub mode, it cannot access database
  }));


  io.use(function (socket, next) {
    cookieParser(core.config.secret)(socket.request, {}, function (err) {
      if (err) {
        next(err);
      } else {
        var
          result = socket.request.signedCookies || socket.request.cookies,
          huntSid = result['hunt.sid'];

        if (!huntSid) {
          next();
          return;
        }

        core.sessionStorage.get(huntSid, function (err, session) {
          if (err) {
            next(err);
          } else {
            if (core.model.User) {
              if (!session) {
                return next();
              }

              if (!session.passport) {
                return next();
              }
              if (!session.passport.user) {
                return next();
              }
              core.model.User.findOneByHuntKey(session.passport.user, function (err, user) {
                if (err) {
                  next(err);
                  return;
                }
                if (user) {
// console.log('user found '+user.username);
                  socket.request.user = user;
                  next();
                } else {
//we break the session, because someone tries to tamper it
                  next(new Error('Session tampering attempt prevented'));
                }
              });
            } else {
              next();
            }
          }
        });
      }
    });
  });

  io.use(function (socket, next) {
    var socketIoConnect = {
      'ip': socket.handshake.address,
      'userAgent': socket.handshake.headers['user-agent'],
    };

    if(socket.request.user){
      socketIoConnect.userId = socket.request.user.id;
      socketIoConnect.user = socket.request.user.toString();
    }
    winston.info('socketio:connect', socketIoConnect);

    next();
  });
//*/
  /**
   * Broadcast message from core
   * via socket.io to all webserver clients - both authorized users
   * and non authorized site visitors
   *
   * @event Hunt#broadcast
   * @type {object}
   * @see Hunt#notify:sio
   * @example
   *
   * core.emit('broadcast','Hello? Can you hear me? Jungle took him!');
   * //emits socket.io event of type `broadcast` with
   * //payload 'Hello? Can you hear me? Jungle took him!'
   *
   * core.emit('broadcast', {type:'screamLoudly',message:'Hello? Can you hear me? Jungle took him!'});
   * //emits 2 socket.io events:
   *
   * //the first one of type `broadcast` with
   * // {type:'screamLoudly',message:'Hello? Can you hear me? Jungle took him!'}
   * //for backward compatibility of huntjs 0.3.x branch
   *
   * //and the second one of type `screamLoudly` with payload
   * //{type:'screamLoudly',message:'Hello? Can you hear me? Jungle took him!'}
   *
   */
  core.on('broadcast', function (message) {
    if (message.type && typeof message.type === 'string') {
      io.emit('broadcast', message); //for backward compatibility
      io.emit(message.type.toString(), message);
    } else {
      io.emit('broadcast', message);
    }
  });

  io.on('connection', function (socket) {
    //console.log(socket);
    if (socket.request.user) {
      if (!socket.request.user.isOnline) {
        socket.request.user.lastSeenOnline = Date.now();
        socket.request.user.save(function (err) {
          if (err) {
            throw err;
          }
        });
      }
    }

    /**
     * Event is emitted each time the socket.io client sends
     * the message by this client side javascript code.
     * See {@link https://github.com/LearnBoost/socket.io/wiki/Exposed-events#server | official socket.io wiki } for details
     * @example
     *
     *      //in client side javascript
     *     var socket = io();
     *     socket.send('Hello!', function(error){...});
     *     socket.emit('message','Hello!', function(error){...}); //the same
     *
     *     //in server side code
     *     hunt.on('message:sio', function (event) {
     *      console.log('We received socket.io event!', event);
     *     });
     *
     *
     *  @event Hunt#message:sio
     *  @type {object}
     *  @property {User|null} user - user, associated with this socket, or null if user is not authenticated
     *  @property {(string|object)} message - message, issued by this socket.io client
     */
    socket.on('message', function (message) {
      core.emit('message:sio', {
        'message': message,
        'user': socket.request.user
      });
    });
  });

  function filterSocketsByUser(socketIo, filter) {
    var
      i,
      handshaken = [];

    for (i in socketIo.sockets.connected) {
      if (socketIo.sockets.connected[i].handshake) {
        handshaken.push(socketIo.sockets.connected[i]);
      }
    }

    return Object.keys(handshaken || {})
      .filter(function (skey) {
        return filter(handshaken[skey].conn.request.user);
      })
      .map(function (skey) {
        return handshaken[skey];
      });
  }


//notifying particular user by means of User#notifyBySocketIo
  core.on('user:notify:sio', function (message) {
    filterSocketsByUser(io, function (user) {
      if (user && user.huntKey && message && message.user && message.user.huntKey) {
        return user.huntKey === message.user.huntKey;
      }
    }).forEach(function (socket) {
      if (message.type && typeof message.type === 'string') {
        socket.emit(message.type.toString(), message);
      } else {
        socket.emit('notify', message);
      }
    });
  });

  return io;
};
