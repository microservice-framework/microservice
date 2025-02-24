/**
 * Process Test task.
 */
'use strict';

import tokenGenerate from './token-generate.js';

export default async function (data, requestDetails) {
  if (!this.mongoDB) {
    this.debug.debug('MongoClient:db is not ready');
    return new Error('DB is not ready');
  }

  let db = this.mongoDB.db(this.settings.mongoDB);
  if (requestDetails.mongoDatabase) {
    db = this.mongoDB.db(requestDetails.mongoDatabase);
  }

  let table = this.settings.mongoTable;
  if (requestDetails.mongoTable) {
    table = requestDetails.mongoTable;
  }

  let collection = db.collection(table);

  // Add default values to data
  data.created = Date.now();
  data.changed = Date.now();
  data.token = tokenGenerate(24);

  try {
    let record = await collection.insertOne(data, { returnDocument: 'after' });
    let removeId = true;
    if (this.id && this.id.field) {
      data.url = process.env.this_PATH + '/' + data[this.id.field];
      if (this.id.field == '_id') {
        removeId = false;
      }
    } else {
      data.id = record.insertedId;
    }
    if (removeId && data._id) {
      delete data._id;
    }
    // return token only if no credentials - no access token
    if (requestDetails.credentials) {
      delete data.token;
    }
    return {
      code: 200,
      answer: data,
    };
  } catch (err) {
    this.debug.debug('MongoClient:insertOne err: %O', err);
    return {
      code: 503,
      answer: err,
    };
  }
}
