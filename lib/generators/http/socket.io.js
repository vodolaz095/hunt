'use strict';

var ioServer = require('socket.io'),
  ioRedis = require('redis'),
  IoRedisStore = require('socket.io/lib/stores/redis'),
  passportSocketIo = require('passport.socketio');

require('colors');

module.exports = exports = function (core) {
    /**
     * @name Hunt#io
     * @description
     * Ready to use {@link http://socket.io } object with passport.js integration
     */
    var io = ioServer.listen(core.httpServer);
    io.enable('browser client cache');
    io.enable('browser client gzip');
    io.enable('browser client etag');
    io.enable('browser client minification');
    io.set('browser client expires', (24 * 60 * 60));

//https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO
//http://stackoverflow.com/questions/15093018/sessions-with-express-js-passport-js


//setting transports for nginx or heroku
//for Pound reverse proxy websockets do not works,
//but xhr/jsonp are enabled after few seconds

    io.set('transports', ['websocket', 'xhr-polling', 'jsonp-polling']);
    io.set('polling duration', 3);

    io.set('log level', core.config.io.loglevel || 2);
    io.enable('try multiple transports');
    io.set('connect timeout', 2000);
    core.app.locals.javascripts.push({'url': '/socket.io/socket.io.js'});


    io.set('store', new IoRedisStore({
      redis: ioRedis,
      redisPub: core.createRedisClient(), //it works in pub mode, it cannot access database
      redisSub: core.createRedisClient(), //it works in sub mode, it cannot access database
      redisClient: core.redisClient
    }));

    io.set('authorization', passportSocketIo.authorize({
        key: 'hunt.sid',
        passport: core.passport,
        secret: core.config.secret,
        store: core.sessionStorage,
        expireAfterSeconds: parseInt(core.config.passport.sessionExpireAfterSeconds) || 180,
        cookieParser: core.express.cookieParser,
        fail: function (data, message, critical, done) { //there is no passportJS user present for this session!
//          console.log('fail');
//          console.log(data);
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
            core.model.User.findOneByApiKey(session.passport.user, function (err, user) {
              if (user) {
// console.log('user found '+user.username);
                data.user = user;
                accept(err, true);
              } else {
//we break the session, because someone tryes to tamper it)
                accept(err, false);
              }
            });
          });
        }
      }
    ));

    /**
     * Broadcast message from core
     * via socket.io to all webserver clients - both authorized users
     * and non authorized site visitors
     *
     * @event Hunt#broadcast
     * @type {object}
     * @see Hunt#notify:sio
     */
    core.on('broadcast', function (message) {
      io.sockets.emit('broadcast', message);
    });

    io.sockets.on('connection', function (socket) {
      //console.log(socket);
      if (socket.handshake.user) {
        if (!socket.handshake.user.isOnline) {
          socket.handshake.user.lastSeenOnline = Date.now();
          socket.handshake.user.save(function (err) {
            if (err) throw err;
          });
        }
      }

      /**
       * Event is emitted each time the socket.io client sends
       * the message by this client side javascript code.
       * See {@link https://github.com/LearnBoost/socket.io/wiki/Exposed-events#server | official socket.io wiki } for details
       * @example
       *
       * ```javascript
       *
       *     var socket = io.connect();
       *     socket.send('Hello!', function(error){...});
       *
       * ```
       *
       *  @event Hunt#message:sio
       *  @type {object}
       *  @property {User|null} user - user, associated with this socket, or null if user is not authenticated
       *  @property {(string|object)} message - message, issued by this socket.io client
       */
      socket.on('message', function (message) {
        core.emit('message:sio', {
          'message': message,
          'user': socket.handshake.user
        });
      });
    });

//notifying particular user by means of User#notifyBySocketIo
    core.on('notify:sio', function (message) {
      console.log('notify:sio');
      console.log(message);

      var activeUsers = io.sockets.manager.handshaken;
      for (var x in activeUsers) {
        if (activeUsers[x].user.apiKey === message.user.apiKey) {
//console.log('We can send notify to active user of '+message.user.username);
//console.log(io.sockets.manager.sockets.sockets[x]);
          if (io.sockets.manager.sockets.sockets[x]) {
            if(message.type && typeof message.type === 'string'){
              io.sockets.manager.sockets.sockets[x].emit(''+message.type, message);
            } else {
              io.sockets.manager.sockets.sockets[x].emit('notify', message);
            }
          }
        }
      }
    });

  return io;
}