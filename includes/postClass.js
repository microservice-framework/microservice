/**
 * Process Test task.
 */
'use strict';

require('dotenv').config();
const tokenGenerate = require('./token-generate.js');
const debugF = require('debug');
const fs = require('fs');

/**
 * Constructor.
 *   Prepare data for test.
 */
function PostClass(db, options, data, requestDetails) {

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

  self.data.created = Date.now();
  self.data.changed = Date.now();
  self.data.token = tokenGenerate(24);

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
  debug: debugF('microservice:post')
};

PostClass.prototype.process = function(callback) {
  var self = this;

  var fileProperty = false;
  if (process.env.FILE_PROPERTY) {
    fileProperty = process.env.FILE_PROPERTY;
  }

  var fileContent = false;
  if (fileProperty) {
    if (self.data[fileProperty]) {
      if (process.env.FILE_PROPERTY_JSON) {
        fileContent = JSON.stringify(self.data[fileProperty]);
      } else {
        fileContent = self.data[fileProperty];
      }
      delete(self.data[fileProperty]);
    }
  }

  if (self.id && self.id.field) {
    if (self.id.fields) {
      for (let name in self.id.fields) {
        let requestPath = self.id.fields[name].split('.');
        let tmp = JSON.parse(JSON.stringify(self.requestDetails));
        let isFind = false;
        for (let item in requestPath) {
          let pathItem = requestPath[item];
          if (tmp[pathItem]) {
            isFind = true;
            tmp = tmp[pathItem];
          }
        }
        if (isFind) {
          self.data[name] = tmp;
        }
      }
    }
  }

  if (!self.mongoDB) {
    self.debug.debug('MongoClient:db is not ready');
    return callback(new Error('DB is not ready'));
  }


  var collection = self.mongoDB.collection(self.mongoTable);
  collection.insertOne(self.data, function(err, result) {
    if (err) {
      self.debug.debug('MongoClient:insertOne err: %O', err);
      return callback(err, null);
    }
    if (fileContent && self.fileDir) {
      fs.writeFile(self.fileDir + '/' + result.insertedId, fileContent);
    }
    if (self.id && self.id.field) {
      self.data.url = process.env.SELF_PATH + '/' + self.data[self.id.field];
    } else {
      self.data.id = result.insertedId;
    }
    if (self.data._id) {
      delete self.data._id;
    }
    if (self.requestDetails.credentials) {
      delete(self.data.token);
    }
    callback(null, {
      code: 200,
      answer: self.data
    });
  });

  return;
};

module.exports = PostClass;
