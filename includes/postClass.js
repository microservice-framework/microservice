/**
 * Process Test task.
 */
'use strict';

require('dotenv').config();
const tokenGenerate = require('./token-generate.js');
const MongoClient = require('mongodb').MongoClient;
const debugF = require('debug');
const fs = require('fs');

/**
 * Constructor.
 *   Prepare data for test.
 */
function PostClass(options, data) {

  // Use a closure to preserve `this`
  var self = this;
  self.mongoUrl = options.mongoUrl;
  self.mongoTable = options.mongoTable;
  self.fileDir = options.fileDir;

  this.data = data;

  this.data.created = Date.now();
  this.data.changed = Date.now();
  this.data.token = tokenGenerate(24);

  if (self.fileDir && self.fileDir != '') {
    if (!fs.existsSync(self.fileDir)) {
      try {
        fs.mkdirSync(self.fileDir);
      } catch (e) {
        console.log('Folder was created right after we checked it.');
      }
    }
  } else {
    self.fileDir = false;
  }
}

PostClass.prototype.data = {};
PostClass.prototype.fileDir = '';
PostClass.prototype.mongoUrl = '';
PostClass.prototype.mongoTable = '';

PostClass.prototype.debug = {
  debug: debugF('microservice:debug')
};

PostClass.prototype.process = function(callback) {
  var self = this;

  var fileProperty = false;
  if (process.env.FILE_PROPERTY) {
    fileProperty = process.env.FILE_PROPERTY;
  }

  var fileContent = false;
  if(fileProperty) {
    if (self.data[fileProperty]) {
      if (process.env.FILE_PROPERTY_JSON) {
        fileContent = JSON.stringify(self.data[fileProperty]);
      } else {
        fileContent = self.data[fileProperty];
      }
      delete(self.data[fileProperty]);
    }
  }

  MongoClient.connect(self.mongoUrl, function(err, db) {
    if(err) {
      self.debug.debug('MongoClient:connect err: %O', err);
      return callback(err, null);
    }

    var collection = db.collection(self.mongoTable);
    collection.insertOne(self.data, function(err, result) {
      db.close();
      if(err) {
        self.debug.debug('MongoClient:insertOne err: %O', err);
        return callback(err, null);
      }
      if (fileContent && self.fileDir) {
        fs.writeFile(self.fileDir + '/' + result.insertedId, fileContent);
      }
      callback(null, {
        code: 200,
        answer: {
          message: 'Task accepted',
          id: result.insertedId,
          token: self.data.token
        }
      });
    });
  });
  return;
};

module.exports = PostClass;
