'use strict';

var errorResponses = require('./errors.js'),
  assert = require('assert');


/**
 * @method ExportModelToRestParameters#canUpdate
 * @param {User} User
 * @param {function} callback - function(error, canUpdateBoolean, arrayOfSettersNamesToUse){...}
 * @description
 * Model instance method, that is called to determine, does the current authenticated user
 * have rights to edit this particular entity, and what setters can be used.
 * @example
 *  //ACL check for ability to update some fields in this current document
 * TrophySchema.methods.canUpdate = function (user, callback) {
 *   var document = this;
 *   callback(null, (document.owner == user.id), ['name', 'scored', 'priority']);
 * };
 */


exports.performUpdate = function (request, response) {
  if (request.preload.canWrite === true) {
    var patch = {};

    request.preload.fieldsWritable.map(function (setter) {
      if (typeof setter === 'string' && request.body[setter] !== undefined) {
        patch[setter] = {
          'new': request.body[setter],
          'old': request.preload.model[setter],
        };
        request.preload.model.set(setter, request.body[setter]);
      }
    });
    request.preload.model.save(function (error) {
      if (error) {
        errorResponses.processError(error, request, response);
      } else {
        var tree = ['REST', request.preload.modelName, 'UPDATE', request.preload.model.id];
        console.log('About to send ', tree);
        request.huntEmit(tree, {
          'ip': request.ip,
          'ips': request.ips,
          'patch': patch,
          'document': request.preload.model,
          'user': request.user
        });
        response.status(200).json({'status': 'Updated', 'code': 200});
      }
    });
  } else {
    if (request.user) {
      errorResponses.error403(response);
    } else {
      errorResponses.error401(response);
    }
  }
};

exports.makeRouterToHandeUpdates = function (core, parameters, router) {
  router.post(/^\/([0-9a-fA-F]{24})$/, core.preload(parameters.modelName), exports.performUpdate);
  router.put(/^\/([0-9a-fA-F]{24})$/, core.preload(parameters.modelName), exports.performUpdate);
  router.patch(/^\/([0-9a-fA-F]{24})$/, core.preload(parameters.modelName), exports.performUpdate);
};