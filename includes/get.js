/**
 * Process Test task.
 */
'use strict';

import { ObjectId } from 'mongodb';
export default async function (recordId, requestDetails) {
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

  let query = {};
  // convert requestDetails.url to number if id is number
  if (this.id && this.id.field) {
    switch (this.id.type) {
      case 'number': {
        query[this.id.field] = parseInt(recordId);
        break;
      }
      case 'float': {
        query[this.id.field] = parseFloat(recordId);
        break;
      }
      case 'ObjectID': {
        query[this.id.field] = new ObjectId(recordId);
        break;
      }
      default: {
        query[this.id.field] = recordId;
      }
    }
  } else {
    query._id = new ObjectId(recordId);
  }
  try {
    let record = await collection.findOne(query);
    if (!record) {
      return {
        code: 404,
        answer: {
          message: 'Not found',
        },
      };
    }
    if (requestDetails.credentials) {
      delete record.token;
    }
    let removeId = true;
    if (this.id && this.id.field) {
      record.url = process.env.SELF_PATH + '/' + record[this.id.field];
      if (this.id.field == '_id') {
        removeId = false;
      }
    } else {
      record.id = record._id;
    }
    if (removeId) {
      delete record._id;
    }
    return {
      code: 200,
      answer: record,
    };
  } catch (err) {
    this.debug.debug('MongoClient:findOne err: %O', err);
    return {
      code: 503,
      answer: err,
    };
  }
}
