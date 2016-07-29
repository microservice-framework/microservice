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
function LogDelete(options, data, requestDetails) {

  // Use a closure to preserve `this`
  var self = this;
  self.mongoUrl = options.mongoUrl;
  self.mongoTable = options.mongoTable;
  self.fileDir = options.fileDir;

  this.data = data;
  this.requestDetails = requestDetails;
}

LogDelete.prototype.data = {};
LogDelete.prototype.requestDetails = {};
LogDelete.prototype.fileDir = '';
LogDelete.prototype.mongoUrl = '';
LogDelete.prototype.mongoTable = '';

LogDelete.prototype.debug = {
  main: debugF('status:main')
};

LogDelete.prototype.process = function(callback) {
  var self = this;

  MongoClient.connect(self.mongoUrl, function(err, db) {
    if (!err) {
      var collection = db.collection(self.mongoTable);
      var query = {
        _id: new ObjectID(self.requestDetails.url)
      };
      collection.findOneAndDelete(query, function(err, result) {
        db.close();
        if (!err) {
          if (!result.value) {
            callback(null, {
              code: 404,
              answer: {
                message: 'Not found'
              }
            });
          } else {
            if (self.fileDir != '') {
              var owner = '';
              var repository = '';
              if (!result.value.owner) {
                owner = result.value.repository.owner;
                repository = result.value.repository.repository;
              } else {
                owner = result.value.owner;
                repository = result.value.repository;
              }

              let filePath = self.fileDir + '/' + owner +
                '/' + repository + '/' + self.requestDetails.url;

              if (fs.existsSync(filePath)) {
                fs.unlink(filePath);
              }
            }
            callback(null, {
              code: 200,
              answer: result.value
            });
          }
        } else {
          callback(err, null);
        }
      });

    } else {
      callback(err, null);
    }
  });
  return;
};

module.exports = LogDelete;
