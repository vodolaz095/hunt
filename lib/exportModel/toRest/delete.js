'use strict';

/**
 * @method ExportModelToRestParameters#canDelete
 * @param {User} User
 * @param {function} callback - function(error, canDeleteBoolean){...}
 * @fires Hunt#REST:collectionName:DELETE:itemId
 * @description
 * Model instance method, that is called to determine, does the current authenticated user have rights to delete this particular entity.
 * Fires `REST:collectionName:DELETE:itemCreatedId` event on successefull entity creation.
 * @example
 * //ACL check for ability to delete this particular document
 * TrophySchema.methods.canDelete = function (user, callback) {
 *    var document = this;
 *    callback(null, (user && document.owner == user.id));
 * };
 */

var winston = require('winston');

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
          'userAgent': request.headers['user-agent'],

          'user': request.user,

          'modelName': request.preload.modelName,
          'document': request.preload.model
        });

        winston.log('verbose', 'REST:%s:DELETE:%s', parameters.modelName, request.preload.model.id, {
          'ip': request.ip,
          'ips': request.ips,
          'userAgent': request.headers['user-agent'],

          'userId': request.user ? request.user.id : null,
          'user': request.user ? request.user.toString() : null,
          'userKeychain': request.user ? JSON.stringify(request.user.keychain) : null,

          'modelName': parameters.modelName,
          'documentId': request.preload.model.id,
          'document': request.preload.model.toString()
        });


        request.huntEmit('broadcast', {'type': parameters.genSub(request.preload.model), 'delete': 'delete'});
        response
          .status(200)
          .json({'code': 200, 'status': 'Deleted'});
      });
    } else {
      if (request.user) {
        core.errorResponses.error403(response);
      } else {
        core.errorResponses.error401(response);
      }
    }
  });
};
