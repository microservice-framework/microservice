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
function GetClass(db, options, requestDetails) {

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

  this.requestDetails = requestDetails;
}

GetClass.prototype.requestDetails = {};
GetClass.prototype.fileDir = '';
GetClass.prototype.mongoUrl = '';
GetClass.prototype.mongoTable = '';

GetClass.prototype.debug = {
  debug: debugF('microservice:get')
};

GetClass.prototype.process = function(callback) {
  var self = this;

  var fileProperty = false;
  if (process.env.FILE_PROPERTY) {
    fileProperty = process.env.FILE_PROPERTY;
  }

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
    } catch (e) {
      return callback (e, null);
    }
  }

  collection.findOne(query, function(err, result) {
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
        } catch (e) {
          if (process.env.FILE_PROPERTY_JSON) {
            result[fileProperty] = {};
          } else {
            result[fileProperty] = '';
          }
        }
      }
    }

    if (self.requestDetails.credentials) {
      delete(result.token);
    }
    if (self.id && self.id.field) {
      result.url = process.env.SELF_PATH + '/' + result[self.id.field];
    } else {
      result.id = result._id;
    }
    delete(result._id);
    return callback(null, {
      code: 200,
      answer: result
    });
  });
  return;
};

module.exports = GetClass;
