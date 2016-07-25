/**
 * Generate hash Signature for request
 */
'use strict';

const crypto = require('crypto');

module.exports = function signature(protocol, data, secret) {
  return crypto.createHmac(protocol, secret)
               .update(data)
               .digest('hex');
};
