'use strict';

var errorResponses = require('./errors.js'),
  assert = require('assert'),
  formatItem = require('./itemFormatter.js');


/**
 * @method ExportModelToRestParameters#canDelete
 * @param {User} User
 * @param {function} callback - function(error, canDeleteBoolean){...}
 * @description
 * Model instance method, that is called to determine, does the current authenticated user have rights to delete this particular entity.
 * @example
 * //ACL check for ability to delete this particular document
 * TrophySchema.methods.canDelete = function (user, callback) {
 *    var document = this;
 *    callback(null, (user && document.owner == user.id));
 * };
 */

module.exports = exports = function (core, parameters, router) {
  router.delete(/^\/([0-9a-fA-F]{24})$/, function (request, response) {
    request.model[parameters.modelName].findById(request.params[0], function (error, itemFound) {
      if (error) {
        throw error;
      } else {
        if (itemFound) {
          assert(typeof itemFound.canDelete === 'function',
              'Hunt.exportModelToRest() - hunt.model.' + parameters.modelName + '.methods.canDelete(user, function(error, canDelete, ownerFieldName){...}) is not defined!');

          itemFound.canDelete(request.user, function (error, canDelete) {
            if (error) {
              throw error;
            } else {
              if (canDelete) {
                itemFound.remove(function (error) {
                  if (error) {
                    throw error;
                  } else {
                    response.status(200);
                    response.json({'status': 'deleted'});
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
  });
};
