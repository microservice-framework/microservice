/**
 * Process Test task.
 */
'use strict';

const signature = require('./signature.js');
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const debugF = require('debug');
const fs = require('fs');

/**
 * Constructor.
 *   Prepare data for test.
 */
function LogValidate(options, data, requestDetails) {

  // Use a closure to preserve `this`
  var self = this;
  self.mongoUrl = options.mongoUrl;
  self.mongoTable = options.mongoTable;
  self.secureKey = options.secureKey;
  this.data = data;
  this.requestDetails = requestDetails;
}

LogValidate.prototype.data = {};
LogValidate.prototype.requestDetails = {};
LogValidate.prototype.mongoUrl = '';
LogValidate.prototype.mongoTable = '';
LogValidate.prototype.secureKey = '';

LogValidate.prototype.debug = {
  main: debugF('status:main'),
  debug: debugF('status:debug')
};

LogValidate.prototype.validate = function(method, callback) {
  var self = this;
  self.debug.debug('Request %s ', JSON.stringify(self.requestDetails , null, 2));
  switch (method) {
    case 'PUT': {
      if (!self.requestDetails.headers.signature && !self.requestDetails.headers.token) {
        return callback(new Error('Signature or Token required'));
      }

      if (self.requestDetails.headers.signature) {
        var sign = self.requestDetails.headers.signature.split('=');
        if (sign.length != 2) {
          return callback(new Error('Malformed signature'));
        }
        if (sign[ 1 ] != signature(sign[ 0 ], this.data, self.secureKey)) {
          return callback(new Error('Signature mismatch'));
        }
        return callback(null);
      }
      if (self.requestDetails.headers.token) {
        if (self.requestDetails.url.length != 24) {
          return callback(new Error('Wrong request'));
        }
        MongoClient.connect(self.mongoUrl, function(err, db) {
          if (err) {
            return callback(err);
          }

          var collection = db.collection(self.mongoTable);
          var query = {
            token: self.requestDetails.headers.token,
            _id: new ObjectID(self.requestDetails.url)
          };
          collection.findOne(query, function(err, result) {
            if (err) {
              return callback(err);
            }
            if (!result) {
              return callback(new Error('Not found'));
            }
            return callback(null);
          });
        });
      }
      break;
    }
    case 'POST':
    case 'SEARCH': {
      if (!self.requestDetails.headers.signature) {
        return callback(new Error('Signature required'));
      }
      var sign = self.requestDetails.headers.signature.split('=');
      if (sign.length != 2) {
        return callback(new Error('Malformed signature'));
      }
      if (sign[ 1 ] != signature(sign[ 0 ], this.data, self.secureKey)) {
        return callback(new Error('Signature mismatch'));
      }
      return callback(null);
      break;
    }
    default: {
      if (!self.requestDetails.headers.token) {
        return callback(new Error('Token required'));
      }
      if (self.requestDetails.url.length != 24) {
        return callback(new Error('Wrong request'));
      }

      MongoClient.connect(self.mongoUrl, function(err, db) {
        if (!err) {
          var collection = db.collection(self.mongoTable);
          var query = {
            token: self.requestDetails.headers.token,
            _id: new ObjectID(self.requestDetails.url)
          };
          collection.findOne(query, function(err, result) {
            db.close();
            if (!err) {
              if (!result) {
                return callback(new Error('Not found'));
              }
              return callback(null);
            }
            return callback(err);
          });
        } else {
          return callback(err);
        }
      });
      break;
    }
  }
};

module.exports = LogValidate;
