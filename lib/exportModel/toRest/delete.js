'use strict';

var
  errorResponses = require('./errors.js');


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
    if (request.preload.canDelete === true) {
      request.preload.model.remove(function (error) {
        if (error) {
          throw error;
        }
        /**
         * @event Hunt#REST:collectionName:DELETE:itemId
         * @property {string} ip - ip address of remote host
         * @property {string} ips - proxy chain if present - {@link http://expressjs.com/api.html#req.ips}
         * @property {string} modelName - name of model being deleted
         * @property {Object} document - document being deleted
         * @property {User} user - user who did this request, and you can blaim him/her for breaking things
         */
        request.huntEmit(['REST', request.preload.modelName, 'DELETE', request.preload.model.id], {
          'ip': request.ip,
          'ips': request.ips,
          'modelName': request.preload.modelName,
          'document': request.preload.model,
          'user': request.user
        });
        response
          .status(200)
          .json({'code': 200, 'status': 'Deleted'});
      });
    } else {
      if (request.user) {
        errorResponses.error403(response);
      } else {
        errorResponses.error401(response);
      }
    }
  });
};
