/**
 * Process Test task.
 */
'use strict';

const debugF = require('debug');
const fs = require('fs');

/**
 * Constructor.
 *   Prepare data for test.
 */
function AggregateClass(db, options, data, requestDetails) {
  // Use a closure to preserve `this`
  var self = this;
  self.mongoDB = db;
  self.mongoTable = options.mongoTable;

  // If there is a need to change default table name.
  if (requestDetails.mongoTable) {
    self.mongoTable = requestDetails.mongoTable;
  }

  self.fileDir = options.fileDir;

  this.data = data;
  this.requestDetails = requestDetails;
}

AggregateClass.prototype.data = {};
AggregateClass.prototype.requestDetails = {};
AggregateClass.prototype.fileDir = '';
AggregateClass.prototype.mongoUrl = '';
AggregateClass.prototype.mongoTable = '';

AggregateClass.prototype.debug = {
  debug: debugF('microservice:aggregate')
};

AggregateClass.prototype.process = function(callback) {
  var self = this;

  if (!self.mongoDB) {
    self.debug.debug('MongoClient:db is not ready');
    return callback(new Error('DB is not ready'));
  }

  var collection = self.mongoDB.collection(self.mongoTable);

  var options = {}
  if(process.env.MAX_TIME_MS){
    options.maxTimeMS = parseInt(process.env.MAX_TIME_MS);
  }

  if (self.requestDetails.executionLimit) {
    options.maxTimeMS = parseInt(self.requestDetails.executionLimit)
  }
  if (self.requestDetails.headers['execution-limit']) {
    options.maxTimeMS = parseInt(self.requestDetails.headers['execution-limit'])
  }
  if (self.requestDetails.headers['force-index']) {
    options.hint = self.requestDetails.headers['force-index'];
  }
  collection.aggregate(self.data, options).toArray(function(err, results) {
    if(err && err.code && err.code == 50) {
      self.debug.debug('executionLimit: %d query: %O',options.maxTimeMS, JSON.stringify(self.data) )
      self.debug.warning('executionLimit: %d query: %O',options.maxTimeMS, JSON.stringify(self.data ) )
    }
    if (err) {
      self.debug.debug('MongoClient:aggregate err: %O', err);
      return callback(err, results);
    }
    if (!results || results.length == 0) {
      self.debug.debug('MongoClient:aggregate object not found.');
      return callback(null, {
        code: 404,
        answer: {
          message: 'Not found'
        }
      });
    }
    return callback(null, {
      code: 200,
      answer: results,
    });
  });

  return;
};

module.exports = AggregateClass;
