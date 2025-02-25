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

  let query = data;
  // Working with two formats, query and data.query
  if (data.query) {
    query = data.query;
  }

  // If search by ID, make sure that we convert it to object first.
  if (query['id'] && query['_id'] === undefined) {
    query['_id'] = query['id'];
    delete query['id'];
  }
  if (query['_id']) {
    let arrayOptions = ['$in', '$nin'];
    let arrayFound = false;
    for (let i of arrayOptions) {
      if (query['_id'][i]) {
        arrayFound = i;
        break;
      }
    }
    if (arrayFound !== false) {
      var ids = [];
      for (var i in query['_id'][arrayFound]) {
        ids.push(new ObjectId(query['_id'][arrayFound][i]));
      }
      query['_id'][arrayFound] = ids;
    }

    let valueOptions = ['$lt', '$lte', '$gt', '$gte'];
    let valueFound = false;
    for (let i of valueOptions) {
      if (query['_id'][i]) {
        valueFound = i;
        break;
      }
    }
    if (valueFound !== false) {
      query['_id'][valueFound] = new ObjectId(query['_id'][valueFound]);
    }
    if (!valueFound && !arrayFound) {
      query['_id'] = new ObjectId(query['_id']);
    }
  }

  let limit = 20;
  if (process.env.LIMIT) {
    limit = parseInt(process.env.LIMIT);
  }
  if (data.limit) {
    limit = data.limit;
  }

  let options = {
    limit: limit,
  };

  if (data.skip) {
    options.skip = data.skip;
  }

  if (data.sort) {
    options.sort = data.sort;
  }

  if (data.fields) {
    options.projection = {};
    for (let i in data.fields) {
      options.projection[data.fields[i]] = 1;
    }
  }

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
    let results = await collection.find(query, options).toArray();
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
    if (data.count) {
      total = await collection.countDocuments(query);
    }
    results.forEach((element) => {
      let removeId = true;
      if (this.settings.id && this.settings.id.field) {
        element.url = process.env.SELF_PATH + '/' + element[this.settings.id.field];
        if (this.settings.id.field == '_id') {
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
    this.debug.debug('MongoClient:find err: %O', err);
    return {
      code: 503,
      answer: err,
    };
  }
}
