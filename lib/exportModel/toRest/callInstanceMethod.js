'use strict';

module.exports = exports = function (core, parameters, router) {
  router.post(/^\/([0-9a-fA-F]{24})\/method$/, function (request, response) {
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
              var tree = ['REST', parameters.modelName, 'CALL_METHOD', methodName, itemFound.id];
              request.huntEmit(tree, {
                'ip': request.ip,
                'ips': request.ips,
                'modelName': parameters.modelName,
                'payload': payload,
                'document': itemFound,
                'response': msg,
                'user': request.user
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