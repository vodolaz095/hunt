module.exports = exports = function (core) {
  var TrophySchema = new core.mongoose.Schema({
    'name': {type: String, unique: true, index: true, required: true},
    'scored': {type: Boolean, default: false},
    'priority': Number,
    'author': {type: core.mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true}
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
    callback(null, {}, ['id', 'name', 'scored', 'priority']);
  };

//ACL check for readable fields in this current document
// `true` means everybody can read 'id', 'name', 'scored', 'priority'
//and the `author` field is populated
  TrophySchema.methods.canRead = function (user, callback) {
    callback(null, true, ['id', 'name', 'scored', 'priority'], ['author']);
  };

//ACL check for ability to update some fields in this current document
//everybody can write to 'name', 'scored', 'priority'
  TrophySchema.methods.canUpdate = function (user, callback) {
    callback(null, true, ['name', 'scored', 'priority']);
  };

//ACL check for ability to delete this particular document
//false means the trophy  cannot be deleted via REST api
  TrophySchema.methods.canDelete = function (user, callback) {
    callback(null, !!user);
  };

//after saving every document changes to database, we broadcast changes to all users
  TrophySchema.post('save', function (documentSaved) {
    core.emit('broadcast', {
      'type': 'trophySaved',
      'trophySaved': {
        'id': documentSaved.id,
        'name': documentSaved.name,
        'scored': documentSaved.scored,
        'priority': documentSaved.priority
      }
    });
  });

//this step is very important - bind mongoose model to current mongo database connection
//and assign it to collection
  return core.mongoConnection.model('Trophy', TrophySchema);
};