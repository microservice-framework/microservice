/**
 * Process Test task.
 */
'use strict';

import { ObjectId } from 'mongodb';
export default async function(recordId, requestDetails) {
  
  if (!this.mongoDB) {
    this.debug.debug('MongoClient:db is not ready');
    return new Error('DB is not ready');
  }

  let collection = this.mongoDB.collection(this.mongoTable);


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
        try {
          query[this.id.field] = new ObjectId(recordId);
        } catch (e) {
          return callback(e, null);
        }
        break;
      }
      default: {
        query[this.id.field] = recordId;
      }
    }
  } else {
    try {
      query._id = new ObjectId(recordId);
    } catch (e) {
      return e;
    }
  }
  try {
    let record = await collection.findOne(query);
    if(!record) {
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
      result.url = process.env.SELF_PATH + '/' + result[this.id.field];
      if (this.id.field == '_id') {
        removeId = false;
      }
    } else {
      result.id = result._id;
    }
    if (removeId) {
      delete result._id;
    }
    return callback(null, {
      code: 200,
      answer: result,
    });
  } catch (err) {
    this.debug.debug('MongoClient:findOne err: %O', err);
    return {
      code: 503,
      answer: err
    };
  }
}
