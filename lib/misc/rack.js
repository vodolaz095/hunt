'use strict';

var
  crypto = require('crypto'),
  seed = crypto.randomBytes(256).toString();

function sha512(str) {
  return crypto.createHash('sha512').update(str).digest('hex').toString();
}

/**
 * @method Hunt#rack
 * @description
 * Generate really long random strings
 * @returns {string} someReallyHardRandomStringThatMakesHackersRealySad
 */

module.exports = exports = function () {
  return sha512(crypto.randomBytes(256).toString() + seed);
};
