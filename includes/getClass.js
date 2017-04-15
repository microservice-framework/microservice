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
function GetClass(options, data, requestDetails) {

  // Use a closure to preserve `this`
  var self = this;
  self.mongoUrl = options.mongoUrl;
  self.mongoTable = options.mongoTable;
  self.fileDir = options.fileDir;

  this.data = data;
  this.requestDetails = requestDetails;
}

GetClass.prototype.data = {};
GetClass.prototype.requestDetails = {};
GetClass.prototype.fileDir = '';
GetClass.prototype.mongoUrl = '';
GetClass.prototype.mongoTable = '';

GetClass.prototype.debug = {
  debug: debugF('microservice:debug')
};

GetClass.prototype.process = function(callback) {
  var self = this;

  var fileProperty = false;
  if (process.env.FILE_PROPERTY) {
    fileProperty = process.env.FILE_PROPERTY;
  }

  MongoClient.connect(self.mongoUrl, function(err, db) {
    if (err) {
      self.debug.debug('MongoClient:connect err: %O', err);
      return callback(err, null);
    }
    var collection = db.collection(self.mongoTable);
    var query = {
      _id: new ObjectID(self.requestDetails.url)
    };

    // If auth_scope active, apply filter to search.
    if (self.requestDetails.auth_scope) {
      for (var i in self.requestDetails.auth_scope) {
        query[i] = self.requestDetails.auth_scope[i];
      }
    }

    collection.findOne(query, function(err, result) {
      db.close();
      if (err) {
        self.debug.debug('MongoClient:findOne err: %O', err);
        return callback(err, null);
      }

      if (!result) {
        self.debug.debug('MongoClient:findOneAndUpdate object not found.');
        return callback(null, {
          code: 404,
          answer: {
            message: 'Not found'
          }
        });
      }
      if (self.fileDir && self.fileDir != '' && fileProperty) {
        var filePath = self.fileDir + '/' + self.requestDetails.url;
        if (fs.existsSync(filePath)) {
          try {
            if (process.env.FILE_PROPERTY_JSON) {
              result[fileProperty] = JSON.parse(fs.readFileSync(filePath));
            } else {
              result[fileProperty] = fs.readFileSync(filePath).toString();
            }
          } catch(e) {
            if (process.env.FILE_PROPERTY_JSON) {
              result[fileProperty] = {};
            } else {
              result[fileProperty] = '';
            }
          }
        }
      }
      return callback(null, {
        code: 200,
        answer: result
      });
    });
  });
  return;
};

module.exports = GetClass;