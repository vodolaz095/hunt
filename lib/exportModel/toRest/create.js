'use strict';

var
  assert = require('assert');

/**
 * @method ExportModelToRestParameters.canCreate
 * @param {User} User
 * @param {function} callback - function(error, canCreateBoolean, NameOfFieldToBeUsedAsOwnerName){...}
 * @fires Hunt#REST:collectionName:CREATE:itemCreatedId
 * @description
 * Model static method, that is called to determine, does the current authenticated user have rights to create entities.
 * Fires `REST:collectionName:CREATE:itemCreatedId` event on successefull entity creation.
 * @example
 *   //ACL check for what fields can user populate on creation
 *    TrophySchema.statics.canCreate = function (user, callback) {
 *       if (user) {
 *         callback(null, true, ['name','scored','priority']);
 *       } else {
 *         callback(null, false);
 *       }
 *     };
 */
module.exports = exports = function (core, parameters, router) {
  router.post('/', function (request, response) {
    assert(typeof request.model[parameters.modelName].canCreate === 'function',
      'Hunt.exportModelToRest() - hunt.model.' + parameters.modelName + '.statics.canCreate(error, canCreate, arrayOfSettersToUse){} is not defined!');

    process.nextTick(function () {
      request.model[parameters.modelName].canCreate(request.user, function (error, canCreate, arrayOfSettersToUse) {
        if (error) {
          throw error;
        }

        if (canCreate) {
          var
            patch = {},
            item = new request.model[parameters.modelName]();
          item[parameters.ownerId] = request.user._id;
          arrayOfSettersToUse.map(function (setter) {
            patch[setter] = request.body[setter];
            item.set(setter.toString(), request.body[setter]);
          });
          item.save(function (error, itemCreated) {
            if (error) {
              core.errorResponses.processError(error, response);
            } else {
              /**
               * @event Hunt#REST:collectionName:CREATE:itemCreatedId
               * @property {string} ip - ip address of remote host
               * @property {string} ips - proxy chain if present - {@link http://expressjs.com/api.html#req.ips}
               * @property {string} modelName - name of model being created
               * @property {Object} document - document created
               * @property {Object} seed - fields used to create new object
               * @property {User} user - user who did this request, and you can blaim him/her for breaking things
               */
              request.huntEmit(['REST', parameters.modelName, 'CREATE', itemCreated.id], {
                'ip': request.ip,
                'ips': request.ips,
                'userAgent': request.headers['user-agent'],

                'user': request.user,

                'modelName': parameters.modelName,
                'document': itemCreated,
                'seed': patch

              });

              winston.log('verbose', 'REST:%s:CREATE:%s', parameters.modelName, itemCreated.id, {
                'ip': request.ip,
                'ips': request.ips,
                'userAgent': request.headers['user-agent'],

                'userId': request.user ? request.user.id : null,
                'user': request.user ? request.user.toString() : null,
                'userKeychain': request.user ? JSON.stringify(request.user.keychain) : null,

                'modelName': parameters.modelName,
                'documentId': itemCreated.id,
                'document': itemCreated.toString(),
                'seed': JSON.stringify(patch)
              });

              response
                .status(201)
                .set('Location', parameters.mountPoint + '/' + itemCreated.id)
                .json({
                  'status': 'Created',
                  'code': 201,
                  'location': parameters.mountPoint + '/' + itemCreated.id,
                  'id': itemCreated.id
                });
            }
          });
        } else {
          if (request.user) {
            core.errorResponses.error403(response);
          } else {
            core.errorResponses.error401(response);
          }
        }
      });
    });
  });
};