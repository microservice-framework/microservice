/**
 * Process Test task.
 */
'use strict';

const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const debugF = require('debug');
const fs = require('fs');

/**
 * Constructor.
 *   Prepare data for test.
 */
function AggregateClass(options, data, requestDetails) {
  // Use a closure to preserve `this`
  var self = this;
  self.mongoUrl = options.mongoUrl;
  self.mongoTable = options.mongoTable;
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
  debug: debugF('microservice:debug')
};

AggregateClass.prototype.process = function(callback) {
  var self = this;

  MongoClient.connect(self.mongoUrl, function(err, db) {
    if (err) {
      self.debug.debug('MongoClient:connect err: %O', err);
      return callback(err, null);
    }

    var collection = db.collection(self.mongoTable);

    collection.aggregate(self.data).toArray(function(err, results) {
      db.close();
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
  });
  return;
};

module.exports = AggregateClass;
