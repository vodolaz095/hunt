We can expose the model as [CRUD - REST interface](http://www.restapitutorial.com/)
(Create, Read, Update, Delete - Representational State Transfer interface), with respect 
to access control lists for every operation and of field object.


```javascript

    var hunt = require('hunt')({
      'port': 3000,
      //'mongoUrl' : 'mongo://localhost/hunt_dev',
      //'enableMongoose' : true,
      'disableCsrf': true
    });
    
    hunt.extendModel('Trophy', function(core){
      var TrophySchema = new core.mongoose.Schema({
        'name': {type: String, unique: true},
        'scored': Boolean,
        'priority': Number,
        'author': { type: core.mongoose.Schema.Types.ObjectId, ref: 'User' }
      });
    
      TrophySchema.index({
        name: 1
      });
    
      //hunt-rest-mongoose exporting
    
      //ACL check for what fields can user populate on creation
      TrophySchema.statics.canCreate = function (user, callback) {
        if (user) {
          callback(null, true, ['name','scored','priority']);
        } else {
          callback(null, false);
        }
      };
    
    //ACL check for what fields can user list and filter
    // {} is filter used for getting list of documents, for example
    // {} - all, {'scored':true } - for only scored, and so on
    // for authorized users we populate the field of `author`
      TrophySchema.statics.listFilter = function (user, callback) {
        if (user) {
          callback(null, {}, ['id', 'name', 'scored', 'priority'],['author']);
        } else {
          callback(null, {}, ['id', 'name', 'scored', 'priority']);
        }
      };
    
    //ACL check for readable fields in this current document
    //everybody can read 'id', 'name', 'scored', 'priority'
    //banned users cannot read the entries
    //authorized users can see the author of Trophy
      TrophySchema.methods.canRead = function (user, callback) {
        if (user) {
          callback(null, !user.isBanned, ['id', 'name', 'scored', 'priority'], ['author']);
        } else {
          callback(null, true, ['id', 'name', 'scored', 'priority']);
        }

      };
    
    //ACL check for ability to update some fields in this current document
    //everybody can write to 'name', 'scored', 'priority'
      TrophySchema.methods.canUpdate = function (user, callback) {
        callback(null, true, ['name', 'scored', 'priority']);
      };
    
    //ACL check for ability to delete this particular document
    //it cannot be deleted
      TrophySchema.methods.canDelete = function (user, callback) {
        callback(null, false);
      };
    
    //after saving every document changes to database, we broadcast changes to all users by socket.io
      TrophySchema.post('save', function (documentSaved) {
        core.emit('broadcast', {'trophySaved': {
          'id': documentSaved.id,
          'name': documentSaved.name,
          'scored': documentSaved.scored,
          'priority': documentSaved.priority
        }});
      });
    //this step is very important - bind mongoose model to current mongo database connection
    //and assign it to collection
      return core.mongoConnection.model('Trophy', TrophySchema);
    });
    
    /*
     * Exporting Trophy model as REST interface
     */
    hunt.exportModelToRest({
      'ownerId':'author', //what field stories the author's id
      'mountPount': '/api/v1/trophy',
      'modelName': 'Trophy'
    });
    
    hunt.startWebServer();

```

More information is published on [ExportModelToRestParameters](/documentation/ExportModelToRestParameters.html)
