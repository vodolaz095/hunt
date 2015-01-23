'use strict';

var errorResponses = require('./errors.js'),
  assert = require('assert'),
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
    if (request.body.id) { //it is default behaviour for https://docs.angularjs.org/api/ngResource/service/$resource $save function
      request.model[parameters.modelName].findById(request.body.id, function (error, itemFound) {
        if (error) {
          throw error;
        } else {
          if (itemFound) {
            assert(typeof itemFound.canUpdate === 'function',
                'Hunt.exportModelToRest() - hunt.model.' + parameters.modelName + '.methods.canUpdate(user, function(error, updateAllowed, arrayOfSetters){...}) is not defined!');

            itemFound.canUpdate(request.user, function (error, updateAllowed, arrayOfSetters) {
              if (error) {
                throw error;
              } else {
                if (updateAllowed) {
                  arrayOfSetters.map(function (setter) {
                    if (typeof setter === 'string' && request.body[setter] != undefined) {
                      itemFound.set(setter, request.body[setter]);
                    }
                  });
                  itemFound.save(function (error) {
                    if (error) {
                      errorResponses.processError(error, request, response);
                    } else {
                      response.status(200);
                      formatItem(itemFound, core, request, response, parameters);
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
          } else {
            errorResponses.error404(response);
          }
        }
      });
    } else {
      assert(typeof request.model[parameters.modelName].canCreate === 'function',
          'Hunt.exportModelToRest() - hunt.model.' + parameters.modelName + '.statics.canCreate(error, canCreate, ownerFieldName){} is not defined!');
      request.model[parameters.modelName].canCreate(request.user, function (error, canCreate, ownerFieldName) {
        if (error) {
          throw error;
        } else {
          if (canCreate) {
            var item = new request.model[parameters.modelName]();
            if (ownerFieldName !== false) {
              ownerFieldName = ownerFieldName || 'owner';
              item[ownerFieldName] = request.user._id;
            }

            item.canUpdate(request.user, function (error, updateAllowed, settersToUse) {
              if (error) {
                throw error;
              } else {
                if (updateAllowed) {
                  settersToUse.map(function (setter) {
                    item.set('' + setter, request.body[setter]);
                  });
                  item.save(function (error, itemCreated) {
                    if (error) {
                      errorResponses.processError(error, request, response);
                    } else {
                      response.status(201);
                      response.set('Location', parameters.mountPoint + '/' + itemCreated.id);
                      formatItem(itemCreated, core, request, response, parameters);
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