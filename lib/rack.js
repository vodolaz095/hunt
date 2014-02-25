'use strict';
//random generator

/**
 * @method Hunt#rack
 * @description
 * Generate realy long random string
 */

var crypto = require('crypto'),
  seed = crypto.randomBytes(256).toString();

function sha512(str) {
  return crypto.createHash('sha512').update(str).digest('hex').toString();
}

module.exports = exports = function () {
  return sha512(seed + crypto.randomBytes(256).toString());
};
