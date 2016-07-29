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
function LogUpdate(options, data, requestDetails) {

  // Use a closure to preserve `this`
  var self = this;
  self.mongoUrl = options.mongoUrl;
  self.mongoTable = options.mongoTable;
  self.fileDir = options.fileDir;

  this.data = data;
  this.requestDetails = requestDetails;

  var owner = '';
  var repository = '';

  if (!data.owner) {
    owner = data.repository.owner;
    repository = data.repository.repository;
  } else {
    owner = data.owner;
    repository = data.repository;
  }


  if (self.fileDir && self.fileDir != '') {
    self.fileDir = self.fileDir + '/' + owner + '/' + repository;
  }
}

LogUpdate.prototype.data = {};
LogUpdate.prototype.requestDetails = {};
LogUpdate.prototype.fileDir = '';
LogUpdate.prototype.mongoUrl = '';
LogUpdate.prototype.mongoTable = '';

LogUpdate.prototype.debug = {
  main: debugF('status:main')
};

LogUpdate.prototype.process = function(callback) {
  var self = this;

  var log = JSON.stringify(self.data.log);
  delete(self.data.log);

  MongoClient.connect(self.mongoUrl, function(err, db) {
    if (!err) {
      var collection = db.collection(self.mongoTable);
      var query = {
        _id: new ObjectID(self.requestDetails.url)
      };
      collection.findOne(query, function(err, resultFind) {
        if (!err) {
          if (!resultFind) {
            return callback(null, {
              code: 404,
              answer: {
                message: 'Not found'
              }
            });
          }
          var record = resultFind;

          // Get all new data to keep all fields. Like created.
          // Update should ignore token
          for (var key in self.data) {
            if (key != 'token' && key != '_id') {
              if (record[key]) {
                record[key] = self.data[key];
              }
            }
          }

          // Update changed field.
          record.changed = Date.now();
          collection.findOneAndUpdate(query, record, { returnOriginal: false },
            function(err, resultUpdate) {
            db.close();
            if (!err) {
              if (!resultUpdate) {
                return callback(null, {
                  code: 404,
                  answer: {
                    message: 'Not found'
                  }
                });
              }

              if (!resultUpdate.value) {
                return callback(null, {
                  code: 503,
                  message: 'Error to save data'
                });
              }
              if (log) {
                fs.writeFile(self.fileDir + '/' + self.requestDetails.url, log);
              }
              return callback(null, {
                code: 200,
                answer: resultUpdate.value
              });

            }
            return callback(err, null);
          });
        } else {
          db.close();
          return callback(err, null);
        }
      });
    } else {
      return callback(err, null);
    }
  });
  return;
};

module.exports = LogUpdate;
