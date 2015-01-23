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
}

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

exports.processError = function (error, request, response) {
  // processing mongoose validation errors
//http://mongoosejs.com/docs/validation.html
  if (error.name === 'ValidationError') {
    response.status(400);
    var errs = [];
    for (var x in error.errors) {
      if (error.errors.hasOwnProperty(x)) {
        errs.push({
          'code': 400,
          'message': error.errors[x].message,
          'field': error.errors[x].path,
          'value': error.errors[x].value
        });
      }
    }
    response.json({
      'status': 'Error',
      'errors': errs
    });
  } else if (error.code === 11000) {
    response.status(400);
    response.json({
      'status': 'Error',
      'errors': [
        {
          'code': 400,
          'message': 'Duplicate entry!'
        }
      ]
    });
  } else {
    throw error;
  }
};