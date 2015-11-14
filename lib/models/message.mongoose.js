'use strict';
var
  fieldsReadable = ['_id', 'id', 'to', 'from', 'new', 'createdAt', 'message', 'ago'],
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
      'to': {type: core.mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true},
      'from': {type: core.mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true},
      'new': {type: Boolean, index: true, default: true},
      'updatedAt': {type: Date, default: Date.now},
      'createdAt': {type: Date, default: Date.now, index: true},
      'message': {type: String, trim: true} //trim whitespaces - http://mongoosejs.com/docs/api.html#schema_string_SchemaString-trim
    });


  messageSchema.path('to').validate(function (value, callback) {
    core.model.User.findById(value, function (error, clientFound) {
      if (error) {
        throw error;
      }
      callback(clientFound !== null);
    });
  }, 'Please provide an existent `to` user id!'); //https://stackoverflow.com/questions/14271682/mongoose-asynchronous-schema-validation-is-not-working

  messageSchema.path('from').validate(function (value, callback) {
    core.model.User.findById(value, function (error, clientFound) {
      if (error) {
        throw error;
      }
      callback(clientFound !== null);
    });
  }, 'Please provide an existent `from` user id!'); //https://stackoverflow.com/questions/14271682/mongoose-asynchronous-schema-validation-is-not-working


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
    callback(null, !!user, ['to', 'message']);
  };

  messageSchema.statics.listFilter = function (user, callback) {
    if (user) {
      if (user.root) {
        callback(null, {}, fieldsReadable, fieldsToPopulate);
      } else {
        callback(null,
          {$or: [{'to': user._id}, {'from': user._id}]},
          fieldsReadable, fieldsToPopulate);
      }
    } else {
      callback(null, false);
    }
  };

  messageSchema.methods.canRead = function (user, callback) {
    if (user && ((user._id.equals(this.to) || user._id.equals(this.from) || user.root))) {
      callback(null, true, fieldsReadable, fieldsToPopulate);
    } else {
      callback(null, false);
    }
  };

  messageSchema.methods.canUpdate = function (user, callback) {
    if (user && (user.root || user._id.equals(this.from))) {
      callback(null, true, fieldsWritable);
    } else {
      callback(null, false);
    }
  };

  messageSchema.methods.canDelete = function (user, callback) {
    callback(null, (user && user.root));
  };

  messageSchema.methods.dismiss = function (user, callback) {
    if (user && user._id.equals(this.to)) {
      this.new = false;
      this.save(callback);
    } else {
      callback(new Error('NOT_YOUR_MESSAGE'));
    }
  };

  messageSchema.post('save', function (msg) {
    msg
      .populate('to from', function (error, messageCreated) {
        if (error) {
          throw error;
        }
        var p = {
          '_id': messageCreated._id,
          'id': messageCreated.id,
          'to': messageCreated.to,
          'new': messageCreated.new,
          'from': messageCreated.from,
          'message': messageCreated.message,
          'createdAt': messageCreated.createdAt,
          'updatedAt': messageCreated.updatedAt,
          'ago': messageCreated.ago
        };
        messageCreated.to.notifyBySocketIo(p, 'notify:pm:in');
        messageCreated.from.notifyBySocketIo(p, 'notify:pm:out');
      });
  });
  return core.mongoConnection.model('Message', messageSchema);
};
