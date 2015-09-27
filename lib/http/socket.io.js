'use strict';
//This code is ugly, I know. Sorry, Nick!
// vodolaz095
var ioServer = require('socket.io'),
  cookieParser = require('cookie-parser'),
  ioRedisAdapter = require('socket.io-redis'),
  passportSocketIo = require('passport.socketio');

require('colors');

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
    io = ioServer(core.httpServer, core.config.io),
    socketIoConfig;

  core.app.locals.javascripts.push({'url': '/socket.io/socket.io.js'});

  io.adapter(ioRedisAdapter({
    pubClient: core.createRedisClient(), //it works in pub mode, it cannot access database
    subClient: core.createRedisClient() //it works in sub mode, it cannot access database
  }));


  socketIoConfig = {
    key: 'hunt.sid',
    passport: core.passport,
    secret: core.config.secret,
    store: core.sessionStorage,
    expireAfterSeconds: Math.abs(parseInt(core.config.passport.sessionExpireAfterSeconds, 10)) || 180,
    cookieParser: cookieParser,
    fail: function (data, message, critical, done) {
//there is no passportJS user present for this session!
//          console.log('fail');
//          console.log(data);
      if (critical) {
        throw new Error(message);
      }
      data.user = null;
      done(null, true);
    },
    success: function (data, accept) { //the passportJS user is present for this session!
// console.log('vvv success');
// console.log(data);
// console.log('^^^ success');
      core.sessionStorage.get(data.sessionID, function (err, session) {
// console.log('v session');
// console.log(session);
// console.log('^ session');
        if (err) {
          accept(err);
          return;
        }
        if (core.model.User) {
          core.model.User.findOneByHuntKey(session.passport.user, function (err, user) {
            if (err) {
              accept(err, false);
              return;
            }
            if (user) {
// console.log('user found '+user.username);
              data.user = user;
              accept(null, true);
            } else {
//we break the session, because someone tries to tamper it
              accept(null, false);
            }
          });
        } else {
          accept(null, true);
        }
      });
    }
  };
  io.use(passportSocketIo.authorize(socketIoConfig));
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

//notifying particular user by means of User#notifyBySocketIo
  core.on('user:notify:sio', function (message) {
    passportSocketIo.filterSocketsByUser(io, function (user) {
      if (user && user.huntKey && message && message.user && message.user.huntKey) {
        return user.huntKey === message.user.huntKey;
      } else {
        return null;
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