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
  self.id = options.id;
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
  validate: debugF('microservice:validate')
};

ValidateClass.prototype.SignatureSystem = function(callback) {
  var self = this;
  self.debug.validate('Validate:SignatureSystem');
  var sign = self.requestDetails.headers.signature.split('=');

  if (sign.length != 2) {
    self.debug.validate('Validate:SignatureSystem Malformed signature');
    return callback(new Error('Malformed signature'));
  }

  if (sign[ 1 ] != signature(sign[ 0 ], self.data, self.secureKey)) {
    self.debug.validate('Validate:SignatureSystem Signature mismatch');
    return callback(new Error('Signature mismatch'));
  }

  return callback(null);
}

ValidateClass.prototype.TokenSystem = function(callback) {
  var self = this;

  self.debug.validate('Validate:TokenSystem');

  MongoClient.connect(self.mongoUrl, function(err, db) {
    if (err) {
      self.debug.validate('MongoClient:connect err: %O', err);
      return callback(err);
    }

    var collection = db.collection(self.mongoTable);
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
      if (self.requestDetails.url.length != 24) {
        self.debug.validate('Validate:TokenSystem Token length != 24');
        return callback(new Error('Wrong request'));
      }

      try {
        query._id = new ObjectID(self.requestDetails.url);
      } catch(e) {
        return callback (e);
      }
    }
    query.token = self.requestDetails.headers.token;

    collection.findOne(query, function(err, result) {
      if (err) {
        self.debug.validate('MongoClient:findOne err: %O', err);
        return callback(err);
      }
      if (!result) {
        self.debug.validate('MongoClient:findOneAndUpdate object not found.');
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

  self.debug.validate('Validate:AccessToken');
  self.clientViaRouter('auth', 'auth', function(err, authServer) {
    if (err) {
      self.debug.validate('Validate:AccessToken err %O', err);
      return callback(new Error('Access denied'));
    }

    authServer.search({
      accessToken: self.requestDetails.headers.access_token,
      scope: process.env.SCOPE,
      validate: true,
    }, function(err, taskAnswer) {
      if (err) {
        self.debug.validate('authServer:search err: %O', err);
        return callback(new Error('Access denied. Token not found or expired.'));
      }

      self.debug.validate('authServer:search %O ', taskAnswer);
      if (!taskAnswer.methods) {
        self.debug.validate('authServer:search no methods provided');
        return callback(new Error('Access denied'));
      }

      if (!taskAnswer.methods[method.toLowerCase()]) {
        self.debug.validate('Request:%s denied', method);
        return callback(new Error('Access denied'));
      }

      self.requestDetails.auth_methods = taskAnswer.methods;

      if (taskAnswer.credentials) {
        self.requestDetails.credentials = taskAnswer.credentials;
      } else {
        self.requestDetails.credentials = {};
      }

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
  self.debug.validate('Validate:requestDetails %O ', self.requestDetails);

  if (self.requestDetails.headers.access_token) {
    return self.AccessToken(method, callback);
  }

  switch (method) {
    case 'PUT': {
      if (!self.requestDetails.headers.signature && !self.requestDetails.headers.token) {
        self.debug.validate('Validate:PUT Signature or Token required');
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
    case 'OPTIONS':
    case 'SEARCH': {
      if (!self.requestDetails.headers.signature) {
        self.debug.validate('Validate:%s Signature required', method);
        return callback(new Error('Signature required'));
      }
      return self.SignatureSystem(callback);
      break;
    }
    default: {
      if (!self.requestDetails.headers.token) {
        self.debug.validate('Validate:%s Token required', method);
        return callback(new Error('Token required'));
      }
      return self.TokenSystem(callback);
      break;
    }
  }
};

module.exports = ValidateClass;
