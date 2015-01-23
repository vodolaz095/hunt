'use strict';

var errorResponses = require('./errors.js'),
  assert = require('assert'),
  formatItem = require('./itemFormatter.js');

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

module.exports = exports = function (core, parameters, router) {
  function performUpdate(id, request, response) {
    request.model[parameters.modelName].findById(id, function (error, itemFound) {
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
// processing mongoose validation errors
//http://mongoosejs.com/docs/validation.html
                    if (error.name === 'ValidationError') {
                      response.status(400);
                      var errs = [];
                      for (var x in error.errors) {
                        if (error.errors.hasOwnProperty(x)) {
                          errs.push({
                            'code': 400,
                            'message': error.errors[x].message,
                            'field': error.errors[x].path,
                            'value': error.errors[x].value
                          });
                        }
                      }
                      response.json({
                        'status': 'Error',
                        'errors': errs
                      });
                    } else if (error.code === 11000) {
                      response.status(400);
                      response.json({
                        'status': 'Error',
                        'errors': [
                          {
                            'code': 400,
                            'message': 'Duplicate entry!'
                          }
                        ]
                      });
                    } else {
                      throw error;
                    }
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
  }

  router.post(/^\/([0-9a-fA-F]{24})$/, function (request, response) {
    performUpdate(request.params[0], request, response);
  });

  router.put(/^\/([0-9a-fA-F]{24})$/, function (request, response) {
    performUpdate(request.params[0], request, response);
  });
};