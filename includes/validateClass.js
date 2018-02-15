/**
 * Process Test task.
 */
'use strict';

const signature = require('./signature.js');
const ObjectID = require('mongodb').ObjectID;
const debugF = require('debug');
const MicroserviceClient = require('@microservice-framework/microservice-client');
const fs = require('fs');

const bind = function(fn, me) { return function() { return fn.apply(me, arguments); }; };

/**
 * Constructor.
 *   Prepare data for test.
 */
function ValidateClass(db, options, data, requestDetails) {

  // Use a closure to preserve `this`
  var self = this;
  self.mongoDB = db;
  self.mongoTable = options.mongoTable;

  // If there is a need to change default table name.
  if (requestDetails.mongoTable) {
    self.mongoTable = requestDetails.mongoTable;
  }

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
  debug: debugF('microservice:validate')
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
      self.debug.debug('Validate:TokenSystem Token length != 24');
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
}

ValidateClass.prototype.AccessToken = function(method, callback) {
  var self = this;

  self.debug.debug('Validate:AccessToken');
  let accessToken = '';
  let msClientSettings = {
    URL: process.env.ROUTER_PROXY_URL + '/auth',
    headers: {
      scope: process.env.SCOPE,
    }
  };
  // Compatibility with old versions
  if (self.requestDetails.headers.access_token) {
    accessToken = self.requestDetails.headers.access_token;
    msClientSettings.headers.access_token = accessToken;
  }
  if (self.requestDetails.headers['Access-Token']) {
    accessToken = self.requestDetails.headers['Access-Token'];
    msClientSettings.headers['Access-Token'] = accessToken;
  }
  let authServer = new MicroserviceClient(msClientSettings);
  authServer.get(accessToken, function(err, answer) {
    if (err) {
      self.debug.debug('authServer:search err: %O', err);
      return callback(new Error('Access denied. Token not found or expired.'));
    }
    self.debug.debug('authServer:search %O ', answer);
    if (!answer.methods) {
      self.debug.debug('authServer:search no methods provided');
      return callback(new Error('Access denied'));
    }

    if (!answer.methods[method.toLowerCase()]) {
      self.debug.debug('Request:%s denied', method);
      return callback(new Error('Access denied'));
    }

    self.requestDetails.auth_methods = answer.methods;

    if (taskAnswer.credentials) {
      self.requestDetails.credentials = answer.credentials;
    } else {
      self.requestDetails.credentials = {};
    }

    return callback(null);
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
    case 'OPTIONS':
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
