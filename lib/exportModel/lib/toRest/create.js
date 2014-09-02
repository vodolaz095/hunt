'use strict';

var errorResponses = require('./errors.js'),
  formatItem = require('./itemFormatter.js');

module.exports = exports = function (core, parameters, router) {
  router.post('/', function (request, response) {
    request.model[parameters.modelName].canCreate(request.user, function (error, canCreate, ownerFieldName) {
      if (error) {
        throw error;
      } else {
        if (canCreate) {
          var item = new request.model[parameters.modelName]();
          ownerFieldName = ownerFieldName || 'owner';
          item[ownerFieldName] = request.user._id;
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
                    throw error;
                  } else {
                    response.status(201);
                    response.set('Location', parameters.mountPoint + '/' + itemCreated.id);
                    formatItem(itemCreated, core, request, response);
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
  });
};