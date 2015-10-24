'use strict';
module.exports = exports = function (core, router) {
  router.get('/myself', function (request, response) {
    if (request.user) {
      response.redirect('/api/v1/user/' + request.user.id);
    } else {
      response
        .status(401)
        .json({
          'status': 'Error',
          'code': 401,
          'message': 'Unauthorized'
        });
    }
  });
};