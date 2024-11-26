/**
 * Process Test task.
 */
'use strict';

const ObjectID = require('mongodb').ObjectID;
const debugF = require('debug');
const fs = require('fs');

const crypto = require('crypto');
function hashObject(data) {
  return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
}

var countCache = {};

/**
 * Constructor.
 *   Prepare data for test.
 */
function SearchClass(db, options, data, requestDetails) {
  // Use a closure to preserve `this`
  var self = this;
  self.mongoDB = db;
  self.mongoTable = options.mongoTable;

  // If there is a need to change default table name.
  if (requestDetails.mongoTable) {
    self.mongoTable = requestDetails.mongoTable;
  }

  self.fileDir = options.fileDir;
  self.id = options.id;
  self.data = data;
  self.requestDetails = requestDetails;
}

SearchClass.prototype.data = {};
SearchClass.prototype.requestDetails = {};
SearchClass.prototype.fileDir = '';
SearchClass.prototype.mongoUrl = '';
SearchClass.prototype.mongoTable = '';

SearchClass.prototype.debug = {
  debug: debugF('microservice:search'),
  warning: debugF('microservice:warning')
};

SearchClass.prototype.processFind = function(cursor, data, count, callback) {
  var self = this;
  var fileProperty = false;
  if (process.env.FILE_PROPERTY) {
    fileProperty = process.env.FILE_PROPERTY;
  }

  if (data.sort) {
    cursor = cursor.sort(data.sort);
  }

  if (data.limit) {
    cursor = cursor.limit(data.limit);
  }
  if (data.skip) {
    cursor = cursor.skip(data.skip);
  }
  var executionLimit = 0 ;
  if(process.env.MAX_TIME_MS){
    executionLimit = parseInt(process.env.MAX_TIME_MS);
  }
  if (data.executionLimit) {
    executionLimit = parseInt(data.executionLimit)
  }
  if (self.requestDetails.headers['execution-limit']) {
    executionLimit = parseInt(self.requestDetails.headers['execution-limit'])
  }
  if(executionLimit > 0) {
    cursor = cursor.maxTimeMS(executionLimit);
  }
  if (self.requestDetails.headers['force-index']) {
    cursor = cursor.hint(self.requestDetails.headers['force-index']);
  }

  cursor.toArray(function(err, results) {
    if (err) {
      self.debug.debug('MongoClient:toArray err: %O', err);
      if(err && err.code && err.code == 50) {
        self.debug.debug('executionLimit: %d query: %O',executionLimit, JSON.stringify(data) )
        self.debug.warning('executionLimit: %d query: %O',executionLimit, JSON.stringify(data) )
      }
      return callback(err, results);
    }
    if (!results || results.length == 0) {
      self.debug.debug('MongoClient:toArray object not found.');
      return callback(null, {
        code: 404,
        answer: {
          message: 'Not found'
        },
        headers: {'x-total-count': count}
      });
    }
    if (data[fileProperty] == true) {
      if (self.fileDir && self.fileDir != '') {
        var filePath = '';

        for (var i in results) {
          if (results[i]._id) {
            if (self.fileDir && self.fileDir != '' && fileProperty) {
              filePath = self.fileDir + '/' + results[i]._id;
              if (fs.existsSync(filePath)) {
                try {
                  if (process.env.FILE_PROPERTY_JSON) {
                    results[i][fileProperty] = JSON.parse(fs.readFileSync(filePath));
                  } else {
                    results[i][fileProperty] = fs.readFileSync(filePath).toString();
                  }
                } catch (e) {
                  if (process.env.FILE_PROPERTY_JSON) {
                    results[i][fileProperty] = {};
                  } else {
                    results[i][fileProperty] = '';
                  }
                }
              }
            }
          }
        }
      }
    }
    results.forEach(function(element) {
      let removeId = true;
      if (self.id && self.id.field) {
        element.url = process.env.SELF_PATH + '/' + element[self.id.field];
        if (self.id.field == '_id') {
          removeId = false;
        }
      } else {
        element.id = element._id;
      }
      if (removeId){
        delete(element._id);
      }
      if (self.requestDetails.credentials) {
        delete(element.token);
      }
    });
    return callback(null, {
      code: 200,
      answer: results,
      headers: {'x-total-count': count}
    });
  });
}

SearchClass.prototype.process = function(callback) {
  var self = this;

  

  if (!self.mongoDB) {
    self.debug.debug('MongoClient:db is not ready');
    return callback(new Error('DB is not ready'));
  }

  var collection = self.mongoDB.collection(self.mongoTable);
  var query = self.data;

  if (self.data.query) {
    query = self.data.query;
  }

  // If search by ID, make sure that we convert it to object first.
  if (query['_id']) {
    if (query['_id']['$in']) {
      var ids = []
      for (var i in query['_id']['$in']) {
        ids.push(new ObjectID(query['_id']['$in'][i]));
      }
      query['_id']['$in'] = ids;
    } else {
      try {
        query['_id'] = new ObjectID(query['_id']);
      } catch (e) {
        return callback (e, null);
      }
    }
  }

  if (query['id']) {
    if (query['id']['$in']) {
      var ids = []
      for (var i in query['id']['$in']) {
        ids.push(new ObjectID(query['id']['$in'][i]));
      }
      query['_id'] = {
        $in: ids
      }
      delete query['id'];
    } else {
      try {
        query['_id'] = new ObjectID(query['id']);
        delete query['id'];
      } catch (e) {
        return callback (e, null);
      }
    }
  }
  var cursor;
  if (self.data.fields) {
    cursor = collection.find(query, self.data.fields);
  } else {
    cursor = collection.find(query);
  }

  if(self.data.noCount) {
    return self.processFind(cursor, self.data, -1, callback);
  }
  let requestHash = '';
  if (process.env.CACHE_COUNT && process.env.CACHE_COUNT > 1) {
    requestHash = hashObject(query);
    if (countCache[requestHash]) {
      var cachedData = countCache[requestHash];
      if (cachedData.expireAt > Math.floor(Date.now() / 1000)) {
        self.debug.debug('Cached count %O', requestHash, cachedData);
        return self.processFind(cursor, self.data, cachedData.count, callback);
      }
      delete countCache[requestHash];
    }
  }
  
  if (self.requestDetails.headers['force-index']) {
    cursor = cursor.hint(self.requestDetails.headers['force-index']);
  }
  
  cursor.count(function(err, count) {
    if (err) {
      self.debug.debug('MongoClient:count err: %O', err);
      return callback(err, null);
    }
    if (process.env.CACHE_COUNT && process.env.CACHE_COUNT > 1) {
      
      countCache[requestHash] = {
        count: count,
        expireAt: Math.floor(Date.now() / 1000) + process.env.CACHE_COUNT // Token expire in 1 hour.
      };
      self.debug.debug('Cached count stored %O', requestHash, countCache[requestHash]);
    }
    self.processFind(cursor, self.data, count, callback);
  });
  return;
};

module.exports = SearchClass;
