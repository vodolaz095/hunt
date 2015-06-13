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
    request.preload.fieldsWritable.map(function (setter) {
      if (typeof setter === 'string' && request.body[setter] !== undefined) {
        request.preload.model.set(setter, request.body[setter]);
      }
    });
    request.preload.model.save(function (error) {
      if (error) {
        errorResponses.processError(error, request, response);
      } else {
        response.status(200).json({ 'status': 'Updated', 'code': 200 });
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