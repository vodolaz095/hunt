var errorResponses = require('./errors.js'),
  formatItem = require('./itemFormatter.js');

module.exports = exports = function (core, parameters, router) {
  router.post(/^\/([0-9a-fA-F]{24})$/, function (request, response) {
    errorResponses.error405(response);
  });

  router.put(/^\/([0-9a-fA-F]{24})$/, function (request, response) {
    request.model[parameters.modelName].findById(request.params[0], function (error, itemFound) {
      if (error) {
        throw error;
      } else {
        if (itemFound) {
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
                    throw error;
                  } else {
                    response.status(200);
                    formatItem(itemFound, core, request, response);
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