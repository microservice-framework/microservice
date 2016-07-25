/**
 * Generate hash Signature for request
 */
'use strict';

const crypto = require('crypto');

module.exports = function tokenGenerate(length) {
  return crypto.randomBytes(length).toString('hex');
};
