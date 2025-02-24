/**
 * Process Test task.
 */
'use strict';

import { ObjectId } from 'mongodb';

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

  let pipeline = data;

  for (let i in pipeline) {
    let item = pipeline[i];
    if (item['$match']) {
      let match = item['$match'];
      // If search by ID, make sure that we convert it to object first.
      if (match['id'] && match['_id'] === undefined) {
        match['_id'] = match['id'];
        delete match['id'];
      }
      if (match['_id']) {
        let arrayOptions = ['$in', '$nin'];
        let arrayFound = false;
        for (let i of arrayOptions) {
          if (match['_id'][i]) {
            arrayFound = i;
            break;
          }
        }
        if (arrayFound !== false) {
          var ids = [];
          for (let j in match['_id'][arrayFound]) {
            ids.push(new ObjectId(match['_id'][arrayFound][j]));
          }
          match['_id'][arrayFound] = ids;
        }

        let valueOptions = ['$lt', '$lte', '$gt', '$gte'];
        let valueFound = false;
        for (let j of valueOptions) {
          if (match['_id'][j]) {
            valueFound = j;
            break;
          }
        }
        if (valueFound !== false) {
          match['_id'][valueFound] = new ObjectId(match['_id'][valueFound]);
        }
        if (!valueFound && !arrayFound) {
          match['_id'] = new ObjectId(match['_id']);
        }
      }
    }
  }
  let options = {};

  var executionLimit = 0;
  if (process.env.MAX_TIME_MS) {
    executionLimit = parseInt(process.env.MAX_TIME_MS);
  }
  if (data.executionLimit) {
    executionLimit = parseInt(data.executionLimit);
  }
  if (requestDetails.headers['execution-limit']) {
    executionLimit = parseInt(requestDetails.headers['execution-limit']);
  }
  if (executionLimit > 0) {
    options.maxTimeMS = executionLimit;
  }

  if (requestDetails.headers['force-index']) {
    options.hint = requestDetails.headers['force-index'];
  }

  try {
    let results = await collection.aggregate(pipeline, options).toArray();
    console.log('results', results);
    if (!results || results.length == 0) {
      this.debug.debug('MongoClient:toArray object not found.');
      return {
        code: 404,
        answer: {
          message: 'Not found',
        },
        headers: { 'x-total-count': 0 },
      };
    }
    let total = -1;
    /*if(data.count) {
      total = await collection.countDocuments(query);
    }*/
    results.forEach((element) => {
      let removeId = true;
      if (this.id && this.id.field) {
        element.url = process.env.SELF_PATH + '/' + element[this.id.field];
        if (this.id.field == '_id') {
          removeId = false;
        }
      } else {
        element.id = element._id;
      }
      if (removeId) {
        delete element._id;
      }
      if (requestDetails.credentials) {
        delete element.token;
      }
    });
    return {
      code: 200,
      answer: results,
      headers: { 'x-total-count': total },
    };
  } catch (err) {
    this.debug.debug('MongoClient:aggregate err: %O', err);
    return {
      code: 503,
      answer: err,
    };
  }
}
