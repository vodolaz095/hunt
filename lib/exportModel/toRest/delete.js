'use strict';

var errorResponses = require('./errors.js'),
  assert = require('assert');


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
  router.delete(/^\/([0-9a-fA-F]{24})$/, core.preload(parameters.modelName), function (request, response) {
    if(request.preload.canDelete === true){
      response
        .status(200)
        .json({'status': 'Deleted'});
    } else {
      if (request.user) {
        errorResponses.error403(response);
      } else {
        errorResponses.error401(response);
      }
    }
  });
};
