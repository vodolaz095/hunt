'use strict';

var
  errorResponses = require('./toRest/errors.js');

module.exports = exports = function (core) {
  return function (parameters) {
    if (parameters.modelName && core.model[parameters.modelName]) {
//todo - more detailed example
      /**
       * @class ExportModelToRestParameters
       * @classdesc
       * Object that hold the configuration parameters needed
       * for exporting {@link model} as {@link http://www.restapitutorial.com/ | REST}
       * interface.
       * Methods exported are listed here - {@link http://docs.huntjs.apiary.io/#exportedrestapifortrophiesfromexampleapplication}
       *
       * @fires Hunt#REST:collectionName:CREATE:itemCreatedId
       * @fires Hunt#REST:collectionName:UPDATE:itemId
       * @fires Hunt#REST:collectionName:DELETE:itemId
       * @fires Hunt#REST:collectionName:CALL_METHOD:methodName:itemId
       * @fires Hunt#REST:collectionName:CALL_METHOD:methodName:itemId
       *
       * @see Hunt#exportModelToRest
       * @property {string} modelName - model to be exported, see {@link model} for details
       * @property {string} ownerId - name of model field where the creator/owner of the entity is stored
       * @property {Array.<string>} statics - name of {@link http://mongoosejs.com/docs/guide.html#statics | static methods} functions to be exported
       * @property {Array.<string>} methods - name of {@link http://mongoosejs.com/docs/guide.html#methods | instance methods } functions to be exported
       * @property {string} [mountPoint='/api/v1/'+modelName] - mount point of REST interface
       * @example
       * var hunt = require('hunt')({'port':3000});
       *
       * hunt.extendModel('Trophy', function (core) {
       *   var TrophySchema = new core.mongoose.Schema({
       *     'name': {type: String, unique: true},
       *     'scored': Boolean,
       *     'priority': Number,
       *     'owner': { type: core.mongoose.Schema.Types.ObjectId, ref: 'User' }
       *   });
       *
       *   TrophySchema.index({
       *     name: 1
       *   });
       *
       *   //hunt-rest-mongoose exporting
       *
       *   //ACL check for what fields can user populate on creation
       *    TrophySchema.statics.canCreate = function (user, callback) {
       *       if (user) {
       *         callback(null, true, ['name', 'scored', 'priority']);
       *       } else {
       *         callback(null, false);
       *       }
       *     };
       *
       * //ACL check for what fields can user list and filter
       * TrophySchema.statics.listFilter = function (user, callback) {
       *   if(user) {
       *     if(user.roles.gameMaster) {
       *       callback(null, {}, ['id','name','scored','priority','owner'],['owner']);
       *     } else {
       *       callback(null, {'owner':user.id}, ['id','name','scored','priority']);
       *     }
       *   } else {
       *       callback(null, false);
       *   }
       * };
       *
       * //ACL check for readable fields in this current document
       * TrophySchema.methods.canRead = function (user, callback) {
       *   if(user) {
       *     if(user.roles.gameMaster) {
       *       callback(null, true, ['id','name','scored','priority','owner'],['owner']);
       *     } else {
       *       callback(null, true, ['id','name','scored','priority']);
       *     }
       *   } else {
       *       callback(null, false);
       *   }
       * };
       *
       * //ACL check for ability to update some fields in this current document
       * TrophySchema.methods.canUpdate = function (user, callback) {
       *   var document = this;
       *   callback(null, (document.owner == user.id), ['name', 'scored', 'priority']);
       * };
       *
       * //ACL check for ability to delete this particular document
       * TrophySchema.methods.canDelete = function (user, callback) {
       *    var document = this;
       *    callback(null, (user && document.owner == user.id));
       * };
       *
       * //after saving every document changes to database, we broadcast changes to all users
       *   TrophySchema.post('save', function (documentSaved) {
       *     core.emit('broadcast', {'trophySaved': {
       *       'id': documentSaved.id,
       *       'name': documentSaved.name,
       *       'scored': documentSaved.scored,
       *       'priority': documentSaved.priority
       *     }});
       *   });
       * //this step is very important - bind mongoose model to current mongo database connection
       * //and assign it to collection
       *   return core.mongoConnection.model('Trophy', TrophySchema);
       * });
       *
       * hunt.exportModelToRest({'modelName':'Trophy'});
       * hunt.startWebServer();
       *
       */
      parameters.mountPoint = (parameters.mountPoint || '/api/v1/' + parameters.modelName).toLowerCase();
      parameters.ownerId = parameters.ownerId || 'owner';
      parameters.statics = parameters.statics || [];
      parameters.methods = parameters.methods || [];
      core.extendController(parameters.mountPoint, function (core, router) {
        require('./toRest/callInstanceMethod.js')(core, parameters, router);
        require('./toRest/callStaticMethod.js')(core, parameters, router);
        require('./toRest/listAll.js')(core, parameters, router);
        require('./toRest/create.js')(core, parameters, router);
        require('./toRest/listOne.js')(core, parameters, router);
        require('./toRest/update.js').makeRouterToHandeUpdates(core, parameters, router);
        require('./toRest/delete.js')(core, parameters, router);
        router.all('*', function (request, response) {
          errorResponses.error501(response);
        });
      });
    } else {
      throw new Error('Hunt.exportModelToRest() - modelName is not defined or corresponding model (' + parameters.modelName + ') does not exist!');
    }
  };
};
