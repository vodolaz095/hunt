'use strict';

module.exports = exports = function (request, response, next) {
  request.session.ref = request.get('referrer');
  next();
};