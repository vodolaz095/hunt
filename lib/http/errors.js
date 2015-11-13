'use strict';

/**
 * @class Hunt#errorResponses
 * @memberof Hunt
 * @instance
 * @classdesc
 * Helper class to generate HTTP errors
 */


/**
 * @method Hunt#Hunt#errorResponses.doError
 * @param {response} response - express application response to write error to
 * @param {number} code - status code of http error
 * @param {string} message - message to be shown to user
 */

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

/**
 * @method Hunt#errorResponses.error401
 * @alias  Hunt#errorResponses.unauthorized
 * @param {response} response
 * @param {string} [message=Unauthorized] message to show to user
 * @description
 * Make Unauthorized error response
 */
exports.unauthorized = exports.error401 = function (response, message) {
  doError(response, 401, message || 'Unauthorized');
};

/**
 * @method Hunt#errorResponses.error403
 * @alias  Hunt#errorResponses#forbidden
 * @param {response} response
 * @param {string} [message=Forbidden] message to show to user
 * @description
 * Make Forbidden error response
 */
exports.forbidden = exports.error403 = function (response, message) {
  doError(response, 403, message || 'Forbidden');
};

/**
 * @method Hunt#errorResponses.error404
 * @alias  Hunt#errorResponses#notFound
 * @param {response} response
 * @param {string} [message=Not Found] message to show to user
 * @description
 * Make Not Found error response
 */
exports.notFound = exports.error404 = function (response, message) {
  doError(response, 404, message || 'Not Found');
};

/**
 * @method Hunt#errorResponses.error405
 * @alias  Hunt#errorResponses#methodNotAllowed
 * @param {response} response
 * @param {string} [message=Method Not Allowed] message to show to user
 * @description
 * Make Unauthorized error response
 */
exports.methodNotAllowed = exports.error405 = function (response, message) {
  doError(response, 405, message || 'Method Not Allowed');
};

/**
 * @method Hunt#errorResponses.error409
 * @alias  Hunt#errorResponses#conflict
 * @param {response} response
 * @param {string} [message=Conflict] message to show to user
 * @description
 * Make Conflict error response
 */
exports.conflict = exports.error409 = function (response, message) {
  doError(response, 409, message || 'Conflict');
};

/**
 * @method Hunt#errorResponses.error501
 * @alias Hunt#errorResponses#notImplemented
 * @param {response} response
 * @param {string} [message=Not Implemented] message to show to user
 * @description
 * Make Unauthorized error response
 */
exports.notImplemented = exports.error501 = function (response, message) {
  doError(response, 501, message || 'Not Implemented');
};


exports.processError = exports.processValidationError = function (error, response) {
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