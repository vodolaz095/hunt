'use strict';

module.exports = exports = function (core, router) {

  router.all(/^\/([0-9a-fA-F]{24})\/dismiss$/, core.preload('Message'), function (request, response) {
    if (request.method === 'GET') {
      core.errorResponses.notImplemented(response);
    } else {
      request.preload.model.dismiss(request.user, function (error) {
        if (error) {
          if (error.message === 'NOT_YOUR_MESSAGE') {
            return core.errorResponses.forbidden(response);
          }
          throw error;
        }
        response.status(200)
          .json({
            'code': 200,
            'status': 'Dismissed'
          });
      });
    }
  });
};