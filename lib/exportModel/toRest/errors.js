'use strict';

function doError(response, code, message) {
  response
    .status(code)
    .json({
      'status': 'Error',
      'code': code,
      'message': message
    });
}
exports.doError = doError;

exports.error401 = function (response, message) {
  doError(response, 401, message || 'Unauthorized');
};

exports.error403 = function (response, message) {
  doError(response, 403, message || 'Forbidden');
};

exports.error404 = function (response, message) {
  doError(response, 404, message || 'Not Found');
};

exports.error405 = function (response, message) {
  doError(response, 405, message || 'Method Not Allowed');
};

exports.error409 = function (response, message) {
  doError(response, 409, message || 'Conflict');
};


exports.processError = function (error, request, response) {
  // processing mongoose validation errors
//http://mongoosejs.com/docs/validation.html
  if (error.name === 'ValidationError') {
    var
      x,
      errs = [];
    for (x in error.errors) {
      if (error.errors.hasOwnProperty(x)) {
        errs.push({
          'message': error.errors[x].message,
          'field': error.errors[x].path,
          'value': error.errors[x].value
        });
      }
    }
    response
      .status(400)
      .json({
        'status': 'Error',
        'code': 400,
        'message': 'Bad Request',
        'validationErrors': errs
      });
  } else if (error.code === 11000) {
    doError(response, 400, 'Duplicate entry');
  } else {
    throw error;
  }
};