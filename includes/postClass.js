/**
 * Process Test task.
 */
'use strict';

import tokenGenerate from './token-generate.js';

export default async function(data, requestDetails) {

  if (!this.mongoDB) {
    this.debug.debug('MongoClient:db is not ready');
    return new Error('DB is not ready');
  }

  // Add default values to data
  data.created = Date.now();
  data.changed = Date.now();
  data.token = tokenGenerate(24);

  let collection = this.mongoDB.collection(this.mongoTable);
  try {
    let record = await collection.insertOne(data);
    let removeId = true;
    if (this.id && this.id.field) {
      record.url = process.env.this_PATH + '/' + record[this.id.field];
      if (this.id.field == '_id') {
        removeId = false;
      }
    } else {
      record.id = result.insertedId;
    }
    if (removeId && record._id) {
      delete record._id;
    }
    // return token only if no credentials - no access token
    if (requestDetails.credentials) {
      delete record.token;
    }
    return {
      code: 200,
      answer: record,
    };
  }
  catch (err) {
    this.debug.debug('MongoClient:insertOne err: %O', err);
    return {
      code: 503,
      answer: err
    };
  }
}
