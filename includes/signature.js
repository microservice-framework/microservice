/**
 * Generate hash Signature for request
 */
'use strict';

import { createHmac } from 'node:crypto';

export default function (protocol, data, secret) {
  return createHmac(protocol, secret).update(data).digest('hex');
}
