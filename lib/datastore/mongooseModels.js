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
     * @name Hunt#mongoConnection
     * @description
     * Mongoose connection object
     * @see Hunt#mongoose
     */
    core.mongoConnection = mongoConnection;

    var
      MongoCollectionOperations = [
        'findOne',
        'insert',
        'remove',
        'save',
        'update',
        'distinct',
        'count',
        'findAndModify',
        'findAndRemove',
        'createIndex',
        'ensureIndex',
        'dropIndex',
        'dropAllIndexes',
        'reIndex'
      ],
      MongoCursorOperations = [
        'toArray',
        'each'
      ];

    MongoCollectionOperations.map(function (x) {

      var original = mongoose.mongo.Collection.prototype[x];
      mongoose.mongo.Collection.prototype[x] = function () {
//      console.log('=======', x, arguments, arguments.length, '========');
        var
          i,
          args = [],
          callback = arguments[arguments.length - 1],
          startedAt = new Date(),
          databaseName = this.databaseName,
          collectionName = this.collectionName,
          tree = ['profiling', 'mongoose', databaseName, collectionName, x];

        for (i = 0; i < (arguments.length - 1); i++) {
          args.push(arguments[i]);
        }

        args.push(function (error, result) {
          var finishedAt = new Date();
          core.emit(tree, {
            'startedAt': startedAt,
            'finishedAt': finishedAt,
            'duration': (finishedAt.getTime() - startedAt.getTime()),
            'driver': 'mongoose',
            'database': databaseName,
            'collection': collectionName,
            'command': x,
            'error': error,
            'result': result
          });
          return callback(error, result);
        });
        return original.apply(this, args);
      };
    });

    MongoCursorOperations.map(function (x) {
      var original = mongoose.mongo.Cursor.prototype[x];
      mongoose.mongo.Cursor.prototype[x] = function (callback) {
        var
          startedAt = new Date(),
          collectionName = this.collectionName,
          databaseName = this.databaseName,
          tree = ['profiling', 'mongoose', databaseName, collectionName, 'find', x];

        return original.call(this, function (error, result) {
          var finishedAt = new Date();
          /**
           * Emitted on every redis command.
           * Namespace is `profiling:mongoose:*` with namespaces consisted of
           * database name, collection and command
           *
           * @see Hunt#on
           * @see Hunt#onAny
           * @see Hunt#once
           * @event Hunt#profiling:mongoose:*
           * @type {object}
           * @property {Date} startedAt
           * @property {Date} finishedAt
           * @property {Number} duration - duration of request in milliseconds
           * @property {String} driver - database driver used, `mongoose` in this case
           * @property {String} command
           * @property {String} database
           * @property {String} collection
           * @property {Error|null} error
           * @property {string} result
           * @tutorial profiling
           * @tutorial events
           * @example
           *
           * function listener(payload){
           *   console.log('We received event '+this.event+' with payload', payload);
           * }
           *
           * //All this listeners will be fired on
           * //redis command `set someKeyName someKeyValue`
           *
           * Hunt.on('profiling:*', listener);
           * Hunt.on('profiling:mongoose:*', listener);
           * Hunt.on('profiling:mongoose:hunt_dev:*', listener);
           * Hunt.on('profiling:mongoose:hunt_dev:users:*', listener);
           * Hunt.on('profiling:mongoose:hunt_dev:users:ensureIndex', listener);
           * Hunt.on('profiling:mongoose:hunt_dev:users:find:*', listener);
           * Hunt.on('profiling:mongoose:hunt_dev:users:find:toArray', listener);
           */
          core.emit(tree, {
            'startedAt': startedAt,
            'finishedAt': finishedAt,
            'duration': (finishedAt.getTime() - startedAt.getTime()),
            'database': databaseName,
            'driver': 'mongoose',
            'collection': collectionName,
            'command': x,
            'error': error,
            'result': result
          });
          return callback(error, result);
        });
      };
    });
  }

  /**
   * @name Hunt#mongoose
   * @description
   * Mongoose object, used for object relation mapping to mongo database
   * {@link http://mongoosejs.com/ | Official Mongoose Documentation }
   */
  core.mongoose = mongoose;
};
