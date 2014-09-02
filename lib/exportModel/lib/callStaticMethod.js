var errorResponses = require('./errors.js');

module.exports = exports = function (core, parameters, router) {
  router.post('/method', function (request, response) {
    var methodName = request.body.method;
    delete request.body.method;
    var payload = request.body;

    if (parameters.statics.indexOf(methodName) !== -1 && typeof request.model[parameters.modelName][methodName] === 'function') {
      request.model[parameters.modelName][methodName](request.user, payload, function (error, msg) {
        if (error) {
          throw error;
        } else {
          response.status(202);//accepted
          response.json(msg);
        }
      });
    } else {
      errorResponses.error404(response, 'Unknown static method!');
    }
  });
};