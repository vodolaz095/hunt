'use strict';

var crypto = require('crypto'),
  seed = crypto.randomBytes(256).toString();

function sha512(str) {
  return crypto.createHash('sha512').update(str).digest('hex').toString();
}

/**
 * @method Hunt#rack
 * @description
 * Generate realy long random strings
 */

module.exports = exports = function (core) {
  return sha512(seed + crypto.randomBytes(256).toString());
};
