'use strict';

var errorResponses = require('./errors.js');

module.exports = exports = function (core, parameters, router) {
  router.post('/method', function (request, response) {
    var
      methodName = request.body.method,
      payload = request.body;

    delete request.body.method;

    if (parameters.statics.indexOf(methodName) !== -1 && typeof request.model[parameters.modelName][methodName] === 'function') {
      request.model[parameters.modelName][methodName](request.user, payload, function (error, msg) {
        if (error) {
          throw error;
        }

        request.huntEmit(['REST', parameters.modelName, 'CALL_STATIC', methodName], {
          'ip': request.ip,
          'ips': request.ips,
          'payload': payload,
          'response': msg,
          'user': request.user
        });

        response.status(202);//accepted
        response.json(msg);

      });
    } else {
      errorResponses.error404(response, 'Unknown static method!');
    }
  });
};