'use strict';

var errorResponses = require('./errors.js'),
  assert = require('assert'),
  formatItem = require('./itemFormatter.js');

/**
 * @method ExportModelToRestParameters#canRead
 * @param {User} User
 * @param {function} callback - function(error, canRead, fieldsToShow, fieldsToPopulate){...}
 * @description
 * Model static method, that is called to determine, does the current authenticated user have rights to read fields of
 * this particular entity, and what fields are readable.
 * @example
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
 */

module.exports = exports = function (core, parameters, router) {
  router.get(/^\/([0-9a-fA-F]{24})$/, function (request, response) {
    request.model[parameters.modelName]
      .findById(request.params[0])
      .exec(function (error, itemFound) {
        if (error) {
          throw error;
        } else {
          if (itemFound) {
            response.status(200);
            formatItem(itemFound, core, request, response, parameters);
          } else {
            errorResponses.error404(response);
          }
        }
      });
  });
};