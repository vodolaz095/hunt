'use strict';
var validator = require('validator');

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
  var messageSchema = new core.mongoose.Schema({
      'to': { type: core.mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
      'from': { type: core.mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
      'createdAt': { type: Date, default: Date.now, index: true },
      'message': { type: String, trim: true } //trim whitespaces - http://mongoosejs.com/docs/api.html#schema_string_SchemaString-trim
    },
    {
      toObject: { getters: true, virtuals: true }, //http://mongoosejs.com/docs/api.html#document_Document-toObject
      toJSON: { getters: true, virtuals: true }
    }
  );


  messageSchema.path('to').validate(function (value, callback) {
    if (value) {
      core.model.User.findById(value, function (error, clientFound) {
        if (error) {
          throw error;
        } else {
          callback(clientFound !== null);
        }
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
        } else {
          callback(clientFound !== null);
        }
      });
    } else {
      callback(true);
    }
  }, 'Please provide an existant `from` user id!'); //https://stackoverflow.com/questions/14271682/mongoose-asynchronous-schema-validation-is-not-working


  messageSchema.pre('save', function (next) {
    this.message = validator.escape(this.message);
    next();
  });

  messageSchema.virtual('ago')
    .get(function () {
      var now = new Date().getTime();
      return Math.floor((now - this.createdAt.getTime()) / 1000);
    });

  return core.mongoConnection.model('Message', messageSchema);
};
