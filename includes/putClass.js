/**
 * Process Test task.
 */
'use strict';
import { ObjectId } from 'mongodb';

const updateAcceptedCmds = [
  '$addToSet',
  '$currentDate',
  '$inc',
  '$max',
  '$min',
  '$mul',
  '$pop',
  '$push',
  '$pushAll',
  '$pull',
  '$pullAll',
  '$set',
  '$unset',
];

export default async function(recordId, data, requestDetails) {
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

  let updateCmd = {};
  let forceSet = true;
  for (let key in data) {
    if (updateAcceptedCmds.includes(key)) {
      forceSet = false;
      updateCmd[key] = data[key];
    }
  }

  if (forceSet) {
    updateCmd['$set'] = data;
  }

  // Update changed field.
  let updateChanged = true;
  if (requestDetails.headers && requestDetails.headers['skip-changed']) {
    updateChanged = false;
  }
  if (updateChanged) {
    if (updateCmd['$set']) {
      updateCmd['$set']['changed'] = Date.now();
    } else {
      updateCmd['$set'] = {
        changed: Date.now(),
      };
    }
  }
  this.debug.debug('updateCmd %O %O', query, updateCmd);
  try {
    let record = await collection.findOneAndUpdate(query, updateCmd);
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
    this.debug.debug('MongoClient:findOneAndUpdate err: %O', err);
    return {
      code: 503,
      answer: err
    };
  }
}
