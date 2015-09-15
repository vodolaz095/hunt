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
        /**
         * @event Hunt#REST:collectionName:CALL_STATIC:methodName
         * @property {string} ip - ip address of remote host
         * @property {string} ips - proxy chain if present - {@link http://expressjs.com/api.html#req.ips}
         * @property {string} modelName - name of model being created
         * @property {Object} payload - data send from user
         * @property {Object} response - data recieved after calling method
         * @property {User} user - user who did this request, and you can blaim him/her for breaking things
         */
        request.huntEmit(['REST', parameters.modelName, 'CALL_STATIC', methodName], {
          'ip': request.ip,
          'ips': request.ips,
          'modelName': parameters.modelName,
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