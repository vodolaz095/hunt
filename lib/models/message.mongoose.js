'use strict';
var
  fieldsReadable = ['_id', 'id', 'to', 'from', 'createdAt', 'message', 'ago'],
  fieldsWritable = ['message'],
  fieldsToPopulate = ['to', 'from'];

/**
 * @class Message
 * @classdesc
 * Class that represents users' private one-to-one messages.
 * Usually used from {@link User} class.
 * This class is an ancestor of mongoose active record object, described here {@link http://mongoosejs.com/docs/documents.html},
 * {@link http://mongoosejs.com/docs/queries.html}
 *
 * Note: before saving message have all special symbols escaped.
 *
 * @property {ObjectId} _id
 * @property {string} id
 * @property {User} to
 * @property {User} from
 * @property {Date} createdAt
 * @property {string} message
 * @property {Number} ago
 * */

module.exports = exports = function (core) {
  var
    validator = core.validator,
    messageSchema = new core.mongoose.Schema({
      'to' : { type : core.mongoose.Schema.Types.ObjectId, ref : 'User', index : true, required : true },
      'from' : { type : core.mongoose.Schema.Types.ObjectId, ref : 'User', index : true, required : true },
      'updatedAt' : { type : Date, default : Date.now },
      'createdAt' : { type : Date, default : Date.now, index : true },
      'message' : { type : String, trim : true } //trim whitespaces - http://mongoosejs.com/docs/api.html#schema_string_SchemaString-trim
    });


  messageSchema.path('to').validate(function (value, callback) {
    if (value) {
      core.model.User.findById(value, function (error, clientFound) {
        if (error) {
          throw error;
        }
        callback(clientFound !== null);
      });
    } else {
      callback(true);
    }
  }, 'Please provide an existant `to` user id!'); //https://stackoverflow.com/questions/14271682/mongoose-asynchronous-schema-validation-is-not-working


  messageSchema.path('from').validate(function (value, callback) {
    if (value) {
      core.model.User.findById(value, function (error, clientFound) {
        if (error) {
          throw error;
        }
        callback(clientFound !== null);
      });
    } else {
      callback(true);
    }
  }, 'Please provide an existant `from` user id!'); //https://stackoverflow.com/questions/14271682/mongoose-asynchronous-schema-validation-is-not-working


  messageSchema.pre('save', function (next) {
    this.message = validator.escape(this.message);
    this.updatedAt = new Date();
    next();
  });

  messageSchema.virtual('ago')
    .get(function () {
      var now = new Date().getTime();
      return Math.floor((now - this.createdAt.getTime()) / 1000);
    });


  messageSchema.statics.canCreate = function (user, callback) {
    process.nextTick(function () {
      callback(null, !!user, ['to', 'message']);
    });
  };

  messageSchema.statics.listFilter = function (user, callback) {
    process.nextTick(function () {
      if (user) {
        if (user.root) {
          callback(null, {}, fieldsReadable, fieldsToPopulate);
        } else {
          callback(null,
            { $or : [{ 'to' : user._id }, { 'from' : user._id }] },
            fieldsReadable, fieldsToPopulate);
        }
      } else {
        callback(null, false);
      }
    });
  };

  messageSchema.methods.canRead = function (user, callback) {
    var
      to = this.to,
      from = this.from;

    process.nextTick(function () {
      if (user && ((user._id.equals(to) || user._id.equals(from) || user.root))) {
        callback(null, true, fieldsReadable, fieldsToPopulate);
      } else {
        callback(null, false);
      }
    });
  };

  messageSchema.methods.canUpdate = function (user, callback) {
    var
      from = this.from;

    process.nextTick(function () {
      if (user && (user.root || user._id.equals(from))) {
        callback(null, true, fieldsWritable);
      } else {
        callback(null, false);
      }
    });
  };

  messageSchema.methods.canDelete = function (user, callback) {
    process.nextTick(function () {
      callback(null, (user && user.root));
    });
  };

  messageSchema.post('save', function (messageCreated) {
    core.async.parallel({
      'to' : function (cb) {
        core.model.User.findById(messageCreated.to, cb);
      },
      'from' : function (cb) {
        core.model.User.findById(messageCreated.from, cb);
      }
    }, function (error, obj) {
      if (error) {
        throw error;
      }
      var p = {
        '_id' : messageCreated._id,
        'id' : messageCreated.id,
        'to' : obj.to,
        'from' : obj.from,
        'message' : messageCreated.message,
        'createdAt' : messageCreated.createdAt,
        'updatedAt' : messageCreated.updatedAt,
        'ago' : messageCreated.ago
      };
      obj.to.notifyBySocketIo(p, 'user:notify:pm');
      obj.from.notifyBySocketIo(p, 'user:notify:pm');
    });
  });
  return core.mongoConnection.model('Message', messageSchema);
};
