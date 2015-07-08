module.exports = exports = function (core) {
  var TrophySchema = new core.mongoose.Schema({
    'name': {type: String, unique: true},
    'scored': Boolean,
    'priority': Number,
    'author': {type: core.mongoose.Schema.Types.ObjectId, ref: 'User'}
  });

  TrophySchema.index({
    name: 1
  });

  //hunt-rest-mongoose exporting

  //ACL check for what fields can user populate on creation
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
//everybody can read 'id', 'name', 'scored', 'priority'
  TrophySchema.methods.canRead = function (user, callback) {
    callback(null, true, ['id', 'name', 'scored', 'priority'], ['author']);
  };

//ACL check for ability to update some fields in this current document
//everybody can write to 'name', 'scored', 'priority'
  TrophySchema.methods.canUpdate = function (user, callback) {
    callback(null, true, ['name', 'scored', 'priority']);
  };

//ACL check for ability to delete this particular document
//it cannot be deleted
  TrophySchema.methods.canDelete = function (user, callback) {
    callback(null, true);
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