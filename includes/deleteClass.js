/**
 * Process Test task.
 */
'use strict';

const ObjectID = require('mongodb').ObjectID;
const debugF = require('debug');
const fs = require('fs');

/**
 * Constructor.
 */
function DeleteClass(db, options, requestDetails) {

  // Use a closure to preserve `this`
  var self = this;
  self.mongoDB = db;
  self.mongoTable = options.mongoTable;

  // If there is a need to change default table name.
  if (requestDetails.mongoTable) {
    self.mongoTable = requestDetails.mongoTable;
  }

  self.id = options.id;
  self.fileDir = options.fileDir;

  this.requestDetails = requestDetails;
}

DeleteClass.prototype.requestDetails = {};
DeleteClass.prototype.fileDir = '';
DeleteClass.prototype.mongoUrl = '';
DeleteClass.prototype.mongoTable = '';

DeleteClass.prototype.debug = {
  debug: debugF('microservice:delete')
};

DeleteClass.prototype.process = function(callback) {
  var self = this;

  if (!self.mongoDB) {
    self.debug.debug('MongoClient:db is not ready');
    return callback(new Error('DB is not ready'));
  }

  var collection = self.mongoDB.collection(self.mongoTable);
  var query = {}
  if (self.id && self.id.field) {
    switch (self.id.type) {
      case 'number': {
        query[self.id.field] = parseInt(self.requestDetails.url);
        break;
      }
      case 'float': {
        query[self.id.field] = parseFloat(self.requestDetails.url);
        break;
      }
      case 'ObjectID': {
        try {
          query[self.id.field] = new ObjectID(self.requestDetails.url);
        } catch (e) {
          return callback (e, null);
        }
        break;
      }
      default: {
        query[self.id.field] = self.requestDetails.url;
      }
    }
    if (self.id.fields) {
      for (let name in self.id.fields) {
        let requestPath = self.id.fields[name].split('.');
        let tmp = JSON.parse(JSON.stringify(self.requestDetails));
        for (let item in requestPath) {
          let pathItem = requestPath[item];
          if (tmp[pathItem]) {
            tmp = tmp[pathItem];
          }
        }
        query[name] = tmp;
      }
    }
  } else {
    try {
      query._id = new ObjectID(self.requestDetails.url);
    } catch(e) {
      return callback (e, null);
    }
  }
  collection.findOneAndDelete(query, function(err, result) {
    if (err) {
      self.debug.debug('MongoClient:findOneAndDelete err: %O', err);
      return callback(err, null);
    }

    if (!result.value) {
      self.debug.debug('MongoClient:findOneAndDelete object not found.');
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

    if (self.requestDetails.credentials) {
      delete(result.value.token);
    }
    if (self.id && self.id.field) {
      result.value.url = process.env.SELF_PATH + '/' + result.value[self.id.field];
    } else {
      result.value.id = result.value._id;
    }
    delete(result.value._id);

    return callback(null, {
      code: 200,
      answer: result.value
    });
  });
  return;
};

module.exports = DeleteClass;
