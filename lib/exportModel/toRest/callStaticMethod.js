'use strict';

var
  winston = require('winston');

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
         * @property {User} user - user who did this request, and you can blame him/her for breaking things
         */
        request.huntEmit(['REST', parameters.modelName, 'CALL_STATIC', methodName], {
          'ip': request.ip,
          'ips': request.ips,
          'userAgent': request.headers['user-agent'],
          'modelName': parameters.modelName,
          'payload': payload,
          'response': msg,
          'user': request.user
        });

        winston.info('REST:%s:CALL_STATIC:%s', parameters.modelName, methodName, {
          'ip': request.ip,
          'ips': request.ips,
          'userAgent': request.headers['user-agent'],

          'userId': request.user ? request.user.id : null,
          'user': request.user ? request.user.toString() : null,
          'userKeychain': request.user ? JSON.stringify(request.user.keychain) : null,

          'modelName': parameters.modelName,

          'method': methodName,
          'payload': JSON.stringify(payload),
          'response': JSON.stringify(msg)
        });

        response.status(202);//accepted
        response.json(msg);

      });
    } else {
      core.errorResponses.error404(response, 'Unknown static method!');
    }
  });
};