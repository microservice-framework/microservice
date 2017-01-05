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
function LogGet(options, data, requestDetails) {

  // Use a closure to preserve `this`
  var self = this;
  self.mongoUrl = options.mongoUrl;
  self.mongoTable = options.mongoTable;
  self.fileDir = options.fileDir;

  this.data = data;
  this.requestDetails = requestDetails;
}

LogGet.prototype.data = {};
LogGet.prototype.requestDetails = {};
LogGet.prototype.fileDir = '';
LogGet.prototype.mongoUrl = '';
LogGet.prototype.mongoTable = '';

LogGet.prototype.debug = {
  main: debugF('status:main')
};

LogGet.prototype.process = function(callback) {
  var self = this;

  var fileProperty = "log";
  if(process.env.FILE_PROPERTY) {
    fileProperty = process.env.FILE_PROPERTY;
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

      collection.findOne(query, function(err, result) {
        db.close();
        if (!err) {
          if (!result) {
            callback(null, {
              code: 404,
              answer: {
                message: 'Not found'
              }
            });
          } else {
            if (self.fileDir && self.fileDir != '') {
              var owner = '';
              var repository = '';
              if (!result.owner) {
                if (result.repository) {
                  owner = result.repository.owner;
                  repository = result.repository.repository;
                }
              } else {
                owner = result.owner;
                repository = result.repository;
              }

              var filePath = self.fileDir + '/' + self.requestDetails.url;
              if (owner != '') {
                filePath = self.fileDir + '/' + owner +
                '/' + repository + '/' + self.requestDetails.url;
              }

              if (fs.existsSync(filePath)) {
                try {
                  if(process.env.FILE_PROPERTY_JSON) {
                    result[fileProperty] = JSON.parse(fs.readFileSync(filePath));
                  } else {
                    result[fileProperty] = fs.readFileSync(filePath);
                  }
                } catch(e) {
                  if(process.env.FILE_PROPERTY_JSON) {
                    result[fileProperty] = {};
                  } else {
                    result[fileProperty] = "";
                  }
                }
              }
            }
            callback(null, {
              code: 200,
              answer: result
            });
          }
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

module.exports = LogGet;
