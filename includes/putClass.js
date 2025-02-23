/**
 * Process Test task.
 */
'use strict';

const ObjectID = require('mongodb').ObjectID;
const debugF = require('debug');
const fs = require('fs');
const updateAcceptedCmds = [
  '$addToSet',
  '$currentDate',
  '$inc',
  '$max',
  '$min',
  '$mul',
  '$pop',
  '$push',
  '$pushAll',
  '$pull',
  '$pullAll',
  '$set',
  '$unset',
];

/**
 * Constructor.
 *   Prepare data for test.
 */
function PutClass(db, options, data, requestDetails) {
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

  self.data = data;
  self.requestDetails = requestDetails;
}

PutClass.prototype.data = {};
PutClass.prototype.requestDetails = {};
PutClass.prototype.fileDir = '';
PutClass.prototype.mongoUrl = '';
PutClass.prototype.mongoTable = '';

PutClass.prototype.debug = {
  debug: debugF('microservice:put'),
};

PutClass.prototype.process = function (callback) {
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
      delete self.data[fileProperty];
    }
  }

  if (!self.mongoDB) {
    self.debug.debug('MongoClient:db is not ready');
    return callback(new Error('DB is not ready'));
  }

  var collection = self.mongoDB.collection(self.mongoTable);

  var query = {};
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
          return callback(e, null);
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
      return callback(e, null);
    }
  }

  var updateCmd = {};
  var forceSet = true;
  for (var key in self.data) {
    if (updateAcceptedCmds.indexOf(key) > -1) {
      forceSet = false;
      updateCmd[key] = self.data[key];
    }
  }

  if (forceSet) {
    updateCmd['$set'] = self.data;
  }

  // Update changed field.
  var updateChanged = true;
  if (self.requestDetails.headers && self.requestDetails.headers['skip-changed']) {
    updateChanged = false;
  }
  if (updateChanged) {
    if (updateCmd['$set']) {
      updateCmd['$set']['changed'] = Date.now();
    } else {
      updateCmd['$set'] = {
        changed: Date.now(),
      };
    }
  }
  self.debug.debug('updateCmd %O', updateCmd);

  collection.findOneAndUpdate(query, updateCmd, { returnOriginal: false }, function (err, resultUpdate) {
    if (err) {
      self.debug.debug('MongoClient:findOneAndUpdate err: %O', err);
      return callback(err, null);
    }
    if (!resultUpdate) {
      self.debug.debug('MongoClient:findOneAndUpdate object not found.');
      return callback(new Error('Not found'), null);
    }

    if (!resultUpdate.value) {
      self.debug.debug('MongoClient:findOneAndUpdate failed to save data.');
      return callback(new Error('Error to save data'), null);
    }
    if (fileContent) {
      var filePath = self.fileDir + '/' + self.requestDetails.url;

      if (fs.existsSync(filePath)) {
        fs.writeFile(filePath, fileContent);
      }
    }
    if (self.requestDetails.credentials) {
      delete resultUpdate.value.token;
    }
    let removeId = true;
    if (self.id && self.id.field) {
      resultUpdate.value.url = process.env.SELF_PATH + '/' + resultUpdate.value[self.id.field];
      if (self.id.field == '_id') {
        removeId = false;
      }
    } else {
      resultUpdate.value.id = resultUpdate.value._id;
    }
    if (removeId) {
      delete resultUpdate.value._id;
    }

    return callback(null, {
      code: 200,
      answer: resultUpdate.value,
    });
  });
  return;
};

module.exports = PutClass;
