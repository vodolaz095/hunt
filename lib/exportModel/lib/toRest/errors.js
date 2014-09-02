'use strict';

function doError(response, code, message) {
  response.status(code);
  response.json({
    'status': 'Error',
    'errors': [
      {
        'code': code,
        'message': message
      }
    ]
  });
};

exports.doError = doError;

exports.error404 = function (response, message) {
  doError(response, 404, message || 'Not found!');
};

exports.error403 = function (response, message) {
  doError(response, 403, message || 'Access denied!');
};

exports.error401 = function (response, message) {
  doError(response, 401, message || 'Authorization required!');
};

exports.error405 = function (response, message) {
  doError(response, 405, message || 'Method not allowed!');
};
