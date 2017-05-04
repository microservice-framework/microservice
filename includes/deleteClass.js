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
function DeleteClass(options, data, requestDetails) {

  // Use a closure to preserve `this`
  var self = this;
  self.mongoUrl = options.mongoUrl;
  self.mongoTable = options.mongoTable;
  self.fileDir = options.fileDir;

  this.data = data;
  this.requestDetails = requestDetails;
}

DeleteClass.prototype.data = {};
DeleteClass.prototype.requestDetails = {};
DeleteClass.prototype.fileDir = '';
DeleteClass.prototype.mongoUrl = '';
DeleteClass.prototype.mongoTable = '';

DeleteClass.prototype.debug = {
  delete: debugF('microservice:delete')
};

DeleteClass.prototype.process = function(callback) {
  var self = this;

  MongoClient.connect(self.mongoUrl, function(err, db) {
    if (err) {
      self.debug.delete('MongoClient:connect err: %O', err);
      return callback(err, null);
    }

    var collection = db.collection(self.mongoTable);
    var query = {
      _id: new ObjectID(self.requestDetails.url)
    };
    collection.findOneAndDelete(query, function(err, result) {
      db.close();
      if (err) {
        self.debug.delete('MongoClient:findOneAndDelete err: %O', err);
        return callback(err, null);
      }

      if (!result.value) {
        self.debug.delete('MongoClient:findOneAndDelete object not found.');
        return callback(null, {
          code: 404,
          answer: {
            message: 'Not found'
          }
        });
      }
      if (self.fileDir && self.fileDir != '') {
        var filePath = self.fileDir + '/' + self.requestDetails.url;
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath);
        }
      }

      if (self.requestDetails.credential) {
        delete(result.value.token);
      }

      result.value.id = result.value._id;
      delete(result.value._id);

      return callback(null, {
        code: 200,
        answer: result.value
      });
    });
  });
  return;
};

module.exports = DeleteClass;
