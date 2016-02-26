'use strict';

var
  winston = require('winston');
module.exports = exports = function (core, parameters, router) {
  router.post(/^\/([0-9a-fA-F]{24}|\d+)\/method$/, function (request, response) {
    request.model[parameters.modelName]
      .findById(request.params[0])
      .exec(function (error, itemFound) {
        if (error) {
          throw error;
        }
        if (itemFound) {
          var methodName = request.body.method,
            payload = request.body;

          delete payload.method;

          if (parameters.statics.indexOf(methodName) !== -1 && typeof itemFound[methodName] === 'function') {
            itemFound[methodName](request.user, payload, function (error, msg) {
              if (error) {
                throw error;
              }
              /**
               * @event Hunt#REST:collectionName:CALL_METHOD:methodName:itemId
               * @property {string} ip - ip address of remote host
               * @property {string} ips - proxy chain if present - {@link http://expressjs.com/api.html#req.ips}
               * @property {string} modelName - name of model being created
               * @property {Object} payload - data send from user
               * @property {Object} response - data recieved after calling method
               * @property {Object} document - document created
               * @property {User} user - user who did this request, and you can blaim him/her for breaking things
               */
              var tree = ['REST', parameters.modelName, 'CALL_METHOD', itemFound.id, methodName];
              request.huntEmit(tree, {
                'ip': request.ip,
                'ips': request.ips,
                'userAgent': request.headers['user-agent'],
                'modelName': parameters.modelName,
                'method': methodName,
                'payload': payload,
                'document': itemFound,
                'response': msg,
                'user': request.user
              });

              winston.info('REST:%s:CALL_METHOD:%s:%s', parameters.modelName, itemFound.id, methodName, {
                'ip': request.ip,
                'ips': request.ips,
                'userAgent': request.headers['user-agent'],

                'userId': request.user ? request.user.id : null,
                'user': request.user ? request.user.toString() : null,
                'userKeychain': request.user ? JSON.stringify(request.user.keychain) : null,

                'modelName': parameters.modelName,
                'documentId': itemFound.id,
                'document': itemFound.toString(),

                'method': methodName,
                'payload': JSON.stringify(payload),
                'response': JSON.stringify(msg)
              });

              response
                .status(202)
                .json(msg);
            });
          } else {
            core.errorResponses.error404(response, 'Unknown instance method!');
          }
        } else {
          core.errorResponses.error404(response);
        }

      });
  });
};