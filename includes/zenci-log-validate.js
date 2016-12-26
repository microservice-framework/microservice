/**
 * Process Test task.
 */
'use strict';

const signature = require('./signature.js');
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const debugF = require('debug');
const MicroserviceClient = require('zenci-microservice-client');
const fs = require('fs');

const bind = function(fn, me) { return function() { return fn.apply(me, arguments); }; };

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
  self.authMethod = options.authMethod || 0;
  self.data = data;
  self.requestDetails = requestDetails;
  self.SignatureSystem = bind(self.SignatureSystem, self);
  self.TokenSystem = bind(self.TokenSystem, self);
  self.AccessToken = bind(self.AccessToken, self);
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

LogValidate.prototype.SignatureSystem = function(callback) {
  var self = this;

  var sign = self.requestDetails.headers.signature.split('=');
  if (sign.length != 2) {
    return callback(new Error('Malformed signature'));
  }
  if (sign[ 1 ] != signature(sign[ 0 ], self.data, self.secureKey)) {
    return callback(new Error('Signature mismatch'));
  }
  return callback(null);
}

LogValidate.prototype.TokenSystem = function(callback) {
  var self = this;

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

LogValidate.prototype.AccessToken = function(callback) {
  var self = this;
  let authServer = new MicroserviceClient({
    URL: process.env.AUTH_URL,
    secureKey: process.env.AUTH_SECRET
  });
  authServer.search({
    "accessToken": self.requestDetails.headers.access_token,
    'scope': process.env.SCOPE
  }, function(err, taskAnswer) {
    if (err) {
      console.log('---');
      console.log(err);
      console.log(err.stack);
      return callback(err, taskAnswer);
    }
    else {
      self.debug.debug('Auth answer %s ', JSON.stringify(taskAnswer , null, 2));
      if(!taskAnswer.values) {
        return callback(new Error('Access denied'));
      }
      self.requestDetails.auth_scope = taskAnswer.values;
      return callback(err, taskAnswer);
    }

  });

}

LogValidate.prototype.validate = function(method, callback) {
  var self = this;
  self.debug.debug('Request %s ', JSON.stringify(self.requestDetails , null, 2));
  if(self.requestDetails.headers.access_token) {
    return self.AccessToken(callback);
  }
  switch (method) {
    case 'PUT': {
      if (!self.requestDetails.headers.signature && !self.requestDetails.headers.token) {
        return callback(new Error('Signature or Token required'));
      }
      if (self.requestDetails.headers.signature) {
        return self.SignatureSystem(callback);
      }
      if (self.requestDetails.headers.token) {
        return self.TokenSystem(callback);
      }
      break;
    }
    case 'POST':
    case 'SEARCH': {
      if (!self.requestDetails.headers.signature) {
        return callback(new Error('Signature required'));
      }

      return self.SignatureSystem(callback);

      break;
    }
    default: {
      if (!self.requestDetails.headers.token) {
        return callback(new Error('Token required'));
      }
      return self.TokenSystem(callback);

      break;
    }
  }
};

module.exports = LogValidate;
