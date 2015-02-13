'use strict';

var errorResponses = require('./errors.js'),
  assert = require('assert'),
  performUpdate = require('./update.js').performUpdate,
  formatItem = require('./itemFormatter.js');

/**
 * @method ExportModelToRestParameters.canCreate
 * @param {User} User
 * @param {function} callback - function(error, canCreateBoolean, NameOfFieldToBeUsedAsOwnerName){...}
 * @description
 * Model static method, that is called to determine, does the current authenticated user have rights to create entities
 * @example
 *   //ACL check for what fields can user populate on creation
 *    TrophySchema.statics.canCreate = function (user, callback) {
 *       if (user) {
 *         callback(null, true, 'author');
 *       } else {
 *         callback(null, false);
 *       }
 *     };
 */
module.exports = exports = function (core, parameters, router) {
  router.post('/', function (request, response) {
    if (request.body.id) {
//it is default behaviour for https://docs.angularjs.org/api/ngResource/service/$resource
// $save function
      performUpdate(request.body.id, parameters, request, response);
    } else {
      assert(typeof request.model[parameters.modelName].canCreate === 'function',
        'Hunt.exportModelToRest() - hunt.model.' + parameters.modelName + '.statics.canCreate(error, canCreate, arrayOfSettersToUse){} is not defined!');

      request.model[parameters.modelName].canCreate(request.user, function (error, canCreate, arrayOfSettersToUse) {
        if (error) {
          throw error;
        } else {
          if (canCreate) {
            var item = new request.model[parameters.modelName]();
            item[parameters.ownerId] = request.user._id;
            arrayOfSettersToUse.map(function (setter) {
              item.set('' + setter, request.body[setter]);
            });
            item.save(function (error, itemCreated) {
              if (error) {
                errorResponses.processError(error, request, response);
              } else {
                response.status(201);
                response.set('Location', parameters.mountPoint + '/' + itemCreated.id);
                response.json({
                  'status': 'Created',
                  'code': 201,
                  'location': parameters.mountPoint + '/' + itemCreated.id,
                  'id': itemCreated.id
                });
              }
            });
          } else {
            if (request.user) {
              errorResponses.error403(response);
            } else {
              errorResponses.error401(response);
            }
          }
        }
      });
    }
  });
};