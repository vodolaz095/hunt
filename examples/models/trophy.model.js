'use strict';

module.exports = exports = function (core) {
  var TrophySchema = new core.mongoose.Schema({
    'name': {type: String, unique: true, index: true, required: true},
    'scored': {type: Boolean, default: false},
    'priority': {type: Number, min: 0, max: 100},
    'author': {type: core.mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true},
    'updatedAt': {type: Date, default: Date.now},
    'createdAt': {type: Date, default: Date.now, index: true}
  });

  TrophySchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
  });

  /*
   * hunt-rest-mongoose exporting
   */

//ACL check for what fields can user populate on creation
// if user is authorized, he/she can create trophy
  TrophySchema.statics.canCreate = function (user, callback) {
    if (user) {
      callback(null, true, ['name', 'scored', 'priority']);
    } else {
      callback(null, false);
    }
  };

//ACL check for what fields can user list and filter
// {} is filter used for getting list of documents, for example
// {} - all, {'scored':true } - for only scored, and so on
  TrophySchema.statics.listFilter = function (user, callback) {
    callback(null, {});
  };

//ACL check for readable fields in this current document
// `true` means everybody can read 'id', 'name', 'scored', 'priority'
//and the `author` field is populated
  TrophySchema.methods.canRead = function (user, callback) {
    callback(null, true, ['id', 'name', 'scored', 'priority', 'author', '$subscribeToken', 'createdAt', 'updatedAt'], ['author']);
  };

//ACL check for ability to update some fields in this current document
//everybody can write to 'name', 'scored', 'priority'
  TrophySchema.methods.canUpdate = function (user, callback) {
    callback(null, true, ['name', 'scored', 'priority']);
  };

//ACL check for ability to delete this particular document
//false means the trophy  cannot be deleted via REST api
  TrophySchema.methods.canDelete = function (user, callback) {
    callback(null, user && user._id.equals(this.author._id || this.author));
  };

//this step is very important - bind mongoose model to current mongo database connection
//and assign it to collection
  return core.mongoConnection.model('Trophy', TrophySchema);
};