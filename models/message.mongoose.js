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
 * @property {ObjectId} to
 * @property {User} toProfile
 * @property {ObjectId} from
 * @property {User} fromProfile
 * @property {Date} createdAt
 * @property {string} message
 * */

module.exports = exports = function (core) {
  var messageSchema = new core.mongoose.Schema({
    'to': core.mongoose.Schema.Types.ObjectId,
    'toProfile': { type: core.mongoose.Schema.Types.ObjectId, ref: 'User' },
    'from': core.mongoose.Schema.Types.ObjectId,
    'fromProfile': { type: core.mongoose.Schema.Types.ObjectId, ref: 'User' },
    'createdAt': { type: Date, default: Date.now },
    'message': {type: String, trim: true } //trim whitespaces - http://mongoosejs.com/docs/api.html#schema_string_SchemaString-trim
  });

  messageSchema.pre('save', function (next) {
    var msg = this;
    msg.message = validator.escape(msg.message);
    next();
  });

  messageSchema.index({
    to: 1,
    from: 1,
    createdAt: 1
  });

  return core.mongoConnection.model('Message', messageSchema);
};
