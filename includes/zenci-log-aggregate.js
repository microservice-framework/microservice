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
function LogAggregate(options, data, requestDetails) {
  // Use a closure to preserve `this`
  var self = this;
  self.mongoUrl = options.mongoUrl;
  self.mongoTable = options.mongoTable;
  self.fileDir = options.fileDir;

  this.data = data;
  this.requestDetails = requestDetails;
}

LogAggregate.prototype.data = {};
LogAggregate.prototype.requestDetails = {};
LogAggregate.prototype.fileDir = '';
LogAggregate.prototype.mongoUrl = '';
LogAggregate.prototype.mongoTable = '';

LogAggregate.prototype.debug = {
  main: debugF('status:main')
};

LogAggregate.prototype.process = function(callback) {
  var self = this;

  MongoClient.connect(self.mongoUrl, function(err, db) {
    if (err) {
      callback(err, null);
    }

    var collection = db.collection(self.mongoTable);

    collection.aggregate(self.data).toArray(function(err, results) {
      db.close();
      if (err) {
        return callback(err, results);
      }
      if (!results || results.length == 0) {
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

module.exports = LogAggregate;
