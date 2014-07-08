'use strict';

var mongoose = require('mongoose');

module.exports = exports = function (core) {
  if (core.config.mongoUrl) {
    var mongoConnection = mongoose.createConnection(core.config.mongoUrl, {
      server: {
        poolSize: 3,
        socketOptions: { keepAlive: 1 }
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
  }
};
