var errorResponses = require('./errors.js'),
  formatItem = require('./itemFormatter.js');

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
            formatItem(itemFound, core, request, response);
          } else {
            errorResponses.error404(response);
          }
        }
      });
  });
};