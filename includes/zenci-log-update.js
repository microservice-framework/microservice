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
function LogUpdate(options, data, requestDetails) {

  // Use a closure to preserve `this`
  var self = this;
  self.mongoUrl = options.mongoUrl;
  self.mongoTable = options.mongoTable;
  self.fileDir = options.fileDir;

  this.data = data;
  this.requestDetails = requestDetails;

}

LogUpdate.prototype.data = {};
LogUpdate.prototype.requestDetails = {};
LogUpdate.prototype.fileDir = '';
LogUpdate.prototype.mongoUrl = '';
LogUpdate.prototype.mongoTable = '';

LogUpdate.prototype.debug = {
  main: debugF('status:main')
};

LogUpdate.prototype.process = function(callback) {
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
        if (updateAcceptedCmds.indexOf(key) > -1 ) {
          forceSet = false;
          updateCmd[key] = self.data[key];
        }
      }

      if(forceSet) {
        updateCmd['$set'] = self.data;
      }

      // Update changed field.
      if(updateCmd['$set']) {
        updateCmd['$set']['changed'] = Date.now();
      } else {
        updateCmd['$set'] = {
          changed: Date.now()
        }
      }

      console.log(updateCmd);

      collection.findOneAndUpdate(query, updateCmd, { returnOriginal: false },
        function(err, resultUpdate) {
        db.close();
        if (!err) {
          if (!resultUpdate) {
            return callback(null, {
              code: 404,
              answer: {
                message: 'Not found'
              }
            });
          }

          if (!resultUpdate.value) {
            return callback(null, {
              code: 503,
              message: 'Error to save data'
            });
          }
          if (log) {
            var owner = '';
            var repository = '';

            if (!resultUpdate.value.owner) {
              if (resultUpdate.value.repository) {
                owner = resultUpdate.value.repository.owner;
                repository = resultUpdate.value.repository.repository;
              }
            } else {
              owner = resultUpdate.value.owner;
              repository = resultUpdate.value.repository;
            }
            var filePath = self.fileDir + '/' + self.requestDetails.url;

            if (owner != '') {
              filePath = self.fileDir + '/' + owner +
              '/' + repository + '/' + self.requestDetails.url;
            }
            if (fs.existsSync(filePath)) {
              fs.writeFile(filePath, fileContent);
            }
          }
          return callback(null, {
            code: 200,
            answer: resultUpdate.value
          });

        }
        return callback(err, null);
      });
    } else {
      return callback(err, null);
    }
  });
  return;
};

module.exports = LogUpdate;
