'use strict';
var crypto = require('crypto');

/**
 * @method Hunt#encrypt
 * @description
 * Encrypt the given text by default or using the custom given secret
 * @param {string} text - text to encrypt
 * @param {string} [secret] - secret to use for encryption, if absent, the value of {@link config#secret } is used
 * @returns {string} - encrypted string
 * @see config
 */

exports.encrypt = function encrypt(text, secret) {
  var
    cipher = crypto.createCipher('aes-256-cbc', secret),
    crypted = cipher.update(text, 'utf8', 'hex');
  crypted += cipher.final('hex');
  return crypted;
};

/**
 * @method Hunt#decrypt
 * @description
 * Decrypt the given text using config.SECRET by default or using the custom given secret
 * @param {string} text - text to decrypt
 * @param {string} [secret] - secret to use for decryption, if absent, the value of {@link config.secret } is used
 * @returns {string} - decrypted string
 * @see config
 */
exports.decrypt = function decrypt(text, secret) {
  var decipher = crypto.createDecipher('aes-256-cbc', secret),
    dec = decipher.update(text, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
};
/**
 * @method Hunt#sha512
 * @description
 * Make sha512 hash of string
 * @param {string} str - text to decrypt
 * @returns {string} - decrypted string
 */

exports.sha512 = function (str) {
  return crypto.createHash('sha512').update(str.toString()).digest('hex').toString();
};

/**
 * @method Hunt#md5
 * @description
 * Decrypt the given text using config.SECRET by default or using the custom given secret
 * @param {string} str - text to decrypt
 * @returns {string} - decrypted string
 */
exports.md5 = function (str) {
  return crypto.createHash('md5').update(str.toString()).digest('hex').toString();
};

