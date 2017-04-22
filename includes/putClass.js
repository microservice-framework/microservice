/**
 * Process Test task.
 */
'use strict';

const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const debugF = require('debug');
const fs = require('fs');
const updateAcceptedCmds = [ '$inc', '$mul', '$set', '$unset', '$min', '$max', '$currentDate' ];

/**
 * Constructor.
 *   Prepare data for test.
 */
function PutClass(options, data, requestDetails) {

  // Use a closure to preserve `this`
  var self = this;
  self.mongoUrl = options.mongoUrl;
  self.mongoTable = options.mongoTable;
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
  debug: debugF('microservice:debug')
};

PutClass.prototype.process = function(callback) {
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
    if (updateCmd['$set']) {
      updateCmd['$set']['changed'] = Date.now();
    } else {
      updateCmd['$set'] = {
        changed: Date.now()
      }
    }
    self.debug.debug('updateCmd %O', updateCmd);

    collection.findOneAndUpdate(query, updateCmd, { returnOriginal: false },
      function(err, resultUpdate) {
      db.close();
      if (err) {
        self.debug.debug('MongoClient:findOneAndUpdate err: %O', err);
        return callback(err, null);
      }
      if (!resultUpdate) {
        self.debug.debug('MongoClient:findOneAndUpdate object not found.');
        return callback(null, {
          code: 404,
          answer: {
            message: 'Not found'
          }
        });
      }

      if (!resultUpdate.value) {
        self.debug.debug('MongoClient:findOneAndUpdate failed to save data.');
        return callback(null, {
          code: 503,
          message: 'Error to save data'
        });
      }
      if (fileContent) {
        var filePath = self.fileDir + '/' + self.requestDetails.url;

        if (fs.existsSync(filePath)) {
          fs.writeFile(filePath, fileContent);
        }
      }
      if (self.requestDetails.auth_scope) {
        delete(resultUpdate.value.token);
      }
      resultUpdate.value.id = resultUpdate.value._id;
      delete(resultUpdate.value._id);

      return callback(null, {
        code: 200,
        answer: resultUpdate.value
      });
    });
  });
  return;
};

module.exports = PutClass;
