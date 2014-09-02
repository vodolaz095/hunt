module.exports = exports = function (core) {
  var ArticleSchema = new core.mongoose.Schema({
    'name': { type: String, unique: true },
    'content': String,
    'author': { type: core.mongoose.Schema.Types.ObjectId, ref: 'User' }
  });

  ArticleSchema.index({
    'name': 1,
    'author': 1
  });
//this step is very important - bind mongoose model to current mongo database connection
// and assign it to collection in mongo database


  ArticleSchema.statics.doSmth = function (user, payload, callback) {
    callback(null, {
      'user': user,
      'body': payload
    });
  };

  ArticleSchema.methods.doSmth = function (user, payload, callback) {
    callback(null, {
      'article': this,
      'user': user,
      'body': payload
    });
  };


  ArticleSchema.statics.canCreate = function (user, callback) {
    if (user) { //only authorized user can create new article
      callback(null, true, 'author');
    } else {
      callback(null, false);
    }
  };

  ArticleSchema.statics.listFilter = function (user, callback) {
    if (user) {
      if (user.root) {
        callback(null, {}, ['id', 'name', 'content', 'author'], ['author']); //root can list all documents!
      } else {
        callback(null, {'author': user._id}, ['id', 'name', 'content']); //non root user can see documents, where he/she is an owner
      }
    } else {
      callback(null, false); //non authorized user cannot list anything!
    }
  };

  ArticleSchema.methods.canRead = function (user, callback) {
    if (user) {
      if (user.root) {
//root can list all documents and all document fields, with populating author
        callback(null, true, ['id', 'name', 'content', 'author'], ['author']);
      } else {
//non root user can see documents, where he/she is an owner
        callback(null, (this.author == user.id), ['id', 'name', 'content']);
      }
    } else {
      callback(null, false); //non authorized user cannot read anything!
    }
  };

  ArticleSchema.methods.canUpdate = function (user, callback) {
    if (user) {
      if (user.root) {
//root can list all documents and all document fields, with populating author
        callback(null, true, ['name', 'content', 'owner']);
      } else {
        callback(null, this.author == user.id, ['name', 'content']);
//non root user can edit `name` and `content` of
//documents, where he/she is an owner
      }
    } else {
      callback(null, false); //non authorized user cannot edit anything!
    }
  };

  ArticleSchema.methods.canDelete = function (user, callback) {
    var document = this;
    if (user) {
      if (user.root) {
        callback(null, true); //root can delete every document
      } else {
        callback(null, document.author == user.id);
//non root user can delete documents, where he/she is an owner
      }
    } else {
      callback(null, false); //non authorized user cannot edit anything!
    }
  };

  return core.mongoConnection.model('Article', ArticleSchema);
};
