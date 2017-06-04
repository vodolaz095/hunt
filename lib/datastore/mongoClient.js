'use strict';

var
  url = require('url'),
  winston = require('winston'),
  mongoose = require('mongoose');

module.exports = exports = function (core) {
  if (core.config.mongoUrl) {
    var
      mongoConnectionStringParsed = url.parse(core.config.mongoUrl),
      mongoConnection = mongoose.createConnection(core.config.mongoUrl, {
      server: {
        poolSize: 3,
        socketOptions: { keepAlive: 60 }
      }
    });



    /**
     * @name Hunt#mongoose
     * @description
     * Mongoose object, used for object relation maping to mongo database
     * {@link http://mongoosejs.com/ | Official Mongoose Documentation }
     */
    core.mongoose = mongoose;
    /**
     * @name Hunt#mongoConnection
     * @description
     * Mongoose connection object
     * @see Hunt#mongoose
     */
    core.mongoConnection = mongoConnection;


    mongoConnection.on('open', function(){
      winston.debug('Process %s established connection to mongodb://%s%s',
        process.pid,
        mongoConnectionStringParsed.host,
        mongoConnectionStringParsed.pathname
      );
    });

    mongoConnection.on('close', function(){
      winston.debug('Process %s closed connection to mongodb://%s%s',
        process.pid,
        mongoConnectionStringParsed.host,
        mongoConnectionStringParsed.pathname
      );
    });
  }
};
