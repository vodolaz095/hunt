'use strict';

var errorResponses = require('./errors.js'),
  assert = require('assert');

exports.performUpdate = function (id, parameters, request, response) {
  request.model[parameters.modelName].findById(id, function (error, itemFound) {
    if (error) {
      throw error;
    } else {
      if (itemFound) {
        assert(typeof itemFound.canUpdate === 'function',
          'Hunt.exportModelToRest() - hunt.model.' + parameters.modelName + '.methods.canUpdate(user, function(error, updateAllowed, arrayOfSetters){...}) is not defined!');

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

        itemFound.canUpdate(request.user, function (error, updateAllowed, arrayOfSetters) {
          if (error) {
            throw error;
          } else {
            if (updateAllowed) {
              arrayOfSetters.map(function (setter) {
                if (typeof setter === 'string' && request.body[setter] !== undefined) {
                  itemFound.set(setter, request.body[setter]);
                }
              });
              itemFound.save(function (error) {
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
          }
        });
      } else {
        errorResponses.error404(response);
      }
    }
  });
};

exports.makeRouterToHandeUpdates = function (core, parameters, router) {

  router.post(/^\/([0-9a-fA-F]{24})$/, function (request, response) {
    exports.performUpdate(request.params[0], parameters, request, response);
  });

  router.put(/^\/([0-9a-fA-F]{24})$/, function (request, response) {
    exports.performUpdate(request.params[0], parameters, request, response);
  });

  router.patch(/^\/([0-9a-fA-F]{24})$/, function (request, response) {
    exports.performUpdate(request.params[0], parameters, request, response);
  });

};