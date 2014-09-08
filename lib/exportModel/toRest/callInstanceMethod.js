'use strict';

var errorResponses = require('./errors.js');

module.exports = exports = function (core, parameters, router) {
  router.post(/^\/([0-9a-fA-F]{24})\/method$/, function (request, response) {
    request.model[parameters.modelName]
      .findById(request.params[0])
      .exec(function (error, itemFound) {
        if (error) {
          throw error;
        } else {
          if (itemFound) {
            var methodName = request.body.method,
              payload = request.body;
            delete payload.method;

            if (parameters.statics.indexOf(methodName) !== -1 && typeof itemFound[methodName] === 'function') {
              itemFound[methodName](request.user, payload, function (error, msg) {
                if (error) {
                  throw error;
                } else {
                  response.status(202);//accepted
                  response.json(msg);
                }
              });
            } else {
              errorResponses.error404(response, 'Unknown instance method!');
            }
          } else {
            errorResponses.error404(response);
          }
        }
      });
  });
};