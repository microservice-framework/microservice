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
function Log(options, data) {

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

    var owner = '';
    var repository = '';

    if (!data.owner) {
      if (data.repository) {
        owner = data.repository.owner;
        repository = data.repository.repository;
      }
    } else {
      owner = data.owner;
      repository = data.repository;
    }

    if (owner != '') {
      if (!fs.existsSync(self.fileDir + '/' + owner)) {
        fs.mkdirSync(self.fileDir + '/' + owner);
      }
      if (!fs.existsSync(self.fileDir + '/' + owner + '/' + repository)) {
        fs.mkdirSync(self.fileDir + '/' + owner + '/' + repository);
      }
      self.fileDir = self.fileDir + '/' + owner + '/' + repository;
    }
  } else {
    self.fileDir = false;
  }
}

Log.prototype.data = {};
Log.prototype.fileDir = '';
Log.prototype.mongoUrl = '';
Log.prototype.mongoTable = '';

Log.prototype.debug = {
  main: debugF('status:main')
};

Log.prototype.process = function(callback) {
  var self = this;

  var fileProperty = "log";
  if(process.env.FILE_PROPERTY) {
    fileProperty = process.env.FILE_PROPERTY;
  }

  var fileContent = false;
  if(self.data[fileProperty]) {
    if(process.env.FILE_PROPERTY_JSON) {
      fileContent = JSON.stringify(self.data[fileProperty]);
    } else {
      fileContent = self.data[fileProperty];
    }
    delete(self.data[fileProperty]);
  }

  MongoClient.connect(self.mongoUrl, function(err, db) {
    if (!err) {
      var collection = db.collection(self.mongoTable);
      collection.insertOne(self.data, function(err, result) {
        db.close();
        if (!err) {
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

module.exports = Log;
