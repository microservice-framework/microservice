/**
 * Process Test task.
 */
'use strict';

const signature = require('./signature.js');
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const debugF = require('debug');
const MicroserviceClient = require('@microservice-framework/microservice-client');
const fs = require('fs');

const bind = function(fn, me) { return function() { return fn.apply(me, arguments); }; };

/**
 * Constructor.
 *   Prepare data for test.
 */
function ValidateClass(options, data, requestDetails) {

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

ValidateClass.prototype.data = {};
ValidateClass.prototype.requestDetails = {};
ValidateClass.prototype.mongoUrl = '';
ValidateClass.prototype.mongoTable = '';
ValidateClass.prototype.secureKey = '';

ValidateClass.prototype.debug = {
  debug: debugF('microservice:debug')
};

ValidateClass.prototype.SignatureSystem = function(callback) {
  var self = this;
  self.debug.debug('Validate:SignatureSystem');
  var sign = self.requestDetails.headers.signature.split('=');

  if (sign.length != 2) {
    self.debug.debug('Validate:SignatureSystem Malformed signature');
    return callback(new Error('Malformed signature'));
  }

  if (sign[ 1 ] != signature(sign[ 0 ], self.data, self.secureKey)) {
    self.debug.debug('Validate:SignatureSystem Signature mismatch');
    return callback(new Error('Signature mismatch'));
  }

  return callback(null);
}

ValidateClass.prototype.TokenSystem = function(callback) {
  var self = this;

  self.debug.debug('Validate:TokenSystem');
  if (self.requestDetails.url.length != 24) {
    self.debug.debug('Validate:TokenSystem Token length != 24');
    return callback(new Error('Wrong request'));
  }

  MongoClient.connect(self.mongoUrl, function(err, db) {
    if (err) {
      self.debug.debug('MongoClient:connect err: %O', err);
      return callback(err);
    }

    var collection = db.collection(self.mongoTable);
    var query = {
      token: self.requestDetails.headers.token,
      _id: new ObjectID(self.requestDetails.url)
    };
    collection.findOne(query, function(err, result) {
      if (err) {
        self.debug.debug('MongoClient:findOne err: %O', err);
        return callback(err);
      }
      if (!result) {
        self.debug.debug('MongoClient:findOneAndUpdate object not found.');
        var error = new Error('Not found');
        error.code = 404;
        return callback(error);
      }
      return callback(null);
    });
  });
}

ValidateClass.prototype.AccessToken = function(method, callback) {
  var self = this;

  self.debug.debug('Validate:AccessToken');
  self.clientViaRouter('auth', 'auth', function(err, authServer) {
    if (err) {
      self.debug.debug('Validate:AccessToken err %O', err);
      return callback(new Error('Access denied'));
    }

    authServer.search({
      accessToken: self.requestDetails.headers.access_token,
      scope: process.env.SCOPE
    }, function(err, taskAnswer) {
      if (err) {
        self.debug.debug('authServer:search err: %O', err);
        return callback(new Error('Access denied. Token not found.'));
      }

      self.debug.debug('authServer:search %O ', taskAnswer);
      if (!taskAnswer.values) {
        self.debug.debug('authServer:search no scope provided');
        return callback(new Error('Access denied'));
      }

      if (!taskAnswer.methods) {
        self.debug.debug('authServer:search no methods provided');
        return callback(new Error('Access denied'));
      }

      if (!taskAnswer.methods[method.toLowerCase()]) {
        self.debug.debug('Request:%s denied', method);
        return callback(new Error('Access denied'));
      }

      self.requestDetails.auth_scope = taskAnswer.values;
      return callback(null);
    });
  });
}

/**
 * Wrapper to get secure access to service by path.
 */
ValidateClass.prototype.clientViaRouter = function(pathPattern, pathURL, callback) {
  let routerServer = new MicroserviceClient({
    URL: process.env.ROUTER_URL,
    secureKey: process.env.ROUTER_SECRET
  });

  routerServer.search({
      path: {
        $in: [pathPattern]
      }
    }, function(err, routes) {
      if (err) {
        return callback(err);
      }
      let msClient = new MicroserviceClient({
        URL: process.env.ROUTER_PROXY_URL + '/' + pathURL,
        secureKey: routes[0].secureKey
      });
      callback(null, msClient);
    });
}

ValidateClass.prototype.validate = function(method, callback) {
  var self = this;
  self.debug.debug('Validate:requestDetails %O ', self.requestDetails);

  if (self.requestDetails.headers.access_token) {
    return self.AccessToken(method, callback);
  }

  switch (method) {
    case 'PUT': {
      if (!self.requestDetails.headers.signature && !self.requestDetails.headers.token) {
        self.debug.debug('Validate:PUT Signature or Token required');
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
        self.debug.debug('Validate:%s Signature required', method);
        return callback(new Error('Signature required'));
      }
      return self.SignatureSystem(callback);
      break;
    }
    default: {
      if (!self.requestDetails.headers.token) {
        self.debug.debug('Validate:%s Token required', method);
        return callback(new Error('Token required'));
      }
      return self.TokenSystem(callback);
      break;
    }
  }
};

module.exports = ValidateClass;
