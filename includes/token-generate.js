/**
 * Generate hash Signature for request
 */
'use strict';

import {randomBytes} from 'node:crypto';

export default async function(length) {
  return await randomBytes(length).toString('hex');
};
