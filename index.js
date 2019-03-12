/**
 * Process JSON validation and execute tasks.
 * Parse request and s
 */
'use strict';

const Validator = require('jsonschema').Validator;
const MongoClient = require('mongodb').MongoClient;
const EventEmitter = require('events').EventEmitter;
const util = require('util');
const PostClass = require('./includes/postClass.js');
const PutClass = require('./includes/putClass.js');
const GetClass = require('./includes/getClass.js');
const DeleteClass = require('./includes/deleteClass.js');
const ValidateClass = require('./includes/validateClass.js');
const SearchClass = require('./includes/searchClass.js');
const AggregateClass = require('./includes/aggregateClass.js');
const OptionsClass = require('./includes/optionsClass.js');
const debugF = require('debug');
const fs = require('fs');

const bind = function(fn, me) { return function() { return fn.apply(me, arguments); }; };

/**
 * Constructor of Microservice object.
 *   .
 *   settings.mongoUrl = process.env.MONGO_URL;
 *   settings.mongoTable = process.env.MONGO_TABLE;
 *   settings.secureKey = process.env.SECURE_KEY;
 *   settings.fileDir = process.env.FILE_DIR
 *   settings.schema = process.env.SCHEMA
 */
function Microservice(settings) {

  // Use a closure to preserve `this`
  var self = this;

  self.settings = settings;

  self.validate = bind(self.validate, self);
  self.get = bind(self.get, self);
  self.post = bind(self.post, self);
  self.put = bind(self.put, self);
  self.delete = bind(self.delete, self);
  self.validateJson = bind(self.validateJson, self);
  self.search = bind(self.search, self);
  self.options = bind(self.options, self);
  self.aggregate = bind(self.aggregate, self);
  self.mongoDB = false;
  self.isTerminate = false
  self.currentRequests = 0

  if (self.settings.mongoUrl) {
    MongoClient.connect(self.settings.mongoUrl, function(err, db) {
      if (err) {
        self.debug.debug('MongoClient:connect err: %O', err);
        self.debug.log('MongoClient:connect failed');
        self.emit('error', err);
        return;
      }
      self.mongoDB = db;
      self.emit('ready', db);
      process.on('SIGINT', function() {
        self.debug.log('SIGINT received');
        self.isTerminate = true
        //self.mongoDB.close()
        if(self.currentRequests === 0) {
          self.debug.log('Close mongo connection');
          self.mongoDB.close()
          return
        }
      });
      // On sigterm close database connection immediately  
      process.on('SIGTERM', function() {
        self.debug.log('SIGTERM received');
        self.mongoDB.close()
      });
    });
  }
}

util.inherits(Microservice, EventEmitter);

/**
 * Settings for microservice.
 */
Microservice.prototype.settings = {};

Microservice.prototype.debug = {
  debug: debugF('microservice:debug'),
  log: debugF('microservice:log')
};

/**
 * Validate data by method.
 */
Microservice.prototype.validate = function(method, jsonData, requestDetails, callback) {
  var self = this;
  let db = false;
  if (requestDetails.mongoDatabase) {
    db = self.mongoDB.db(requestDetails.mongoDatabase);
  } else {
    db = self.mongoDB;
  }
  self.currentRequests++
  var Validate = new ValidateClass(db, self.settings, jsonData, requestDetails);
  Validate.validate(method, function(err, handlerAnswer) {
    self.currentRequests--
    callback(err, handlerAnswer)
    if(self.isTerminate && self.currentRequests === 0 ) {
      self.debug.log('Close mongo connection');
      self.mongoDB.close()
    }
  });
  return Validate;
};

/**
 * Process Get request.
 */
Microservice.prototype.get = function(jsonData, requestDetails, callback) {
  var self = this;
  let db = false;
  if (requestDetails.mongoDatabase) {
    db = self.mongoDB.db(requestDetails.mongoDatabase);
  } else {
    db = self.mongoDB;
  }
  self.currentRequests++
  if (arguments.length === 2) {
    // v1.3 < version compatibility
    callback = requestDetails;
    requestDetails = jsonData;
  }

  var Get = new GetClass(db, self.settings, requestDetails);
  Get.process(function(err, handlerAnswer) {
    self.currentRequests--
    callback(err, handlerAnswer)
    if(self.isTerminate && self.currentRequests === 0 ) {
      self.debug.log('Close mongo connection');
      self.mongoDB.close()
    }
  });
  return Get;

};

/**
 * Process Get request.
 */
Microservice.prototype.post = function(jsonData, requestDetails, callback) {
  var self = this;

  var errors = self.validateJson(jsonData);
  if (true !== errors) {
    var error = new Error;
    error.message = errors.join();
    self.debug.debug('POST:validateJson %O', error);
    return callback(error);
  }
  let db = false;
  self.currentRequests++
  if (requestDetails.mongoDatabase) {
    db = self.mongoDB.db(requestDetails.mongoDatabase);
  } else {
    db = self.mongoDB;
  }
  var Post = new PostClass(db,self.settings, jsonData, requestDetails);
  Post.process(function(err, handlerAnswer) {
    self.currentRequests--
    callback(err, handlerAnswer)
    if(self.isTerminate && self.currentRequests === 0 ) {
      self.debug.log('Close mongo connection');
      self.mongoDB.close()
    }
  });
  return Post;

};

/**
 * Process PUT request.
 */
Microservice.prototype.put = function(jsonData, requestDetails, callback) {
  var self = this;
  let db = false;
  self.currentRequests++
  if (requestDetails.mongoDatabase) {
    db = self.mongoDB.db(requestDetails.mongoDatabase);
  } else {
    db = self.mongoDB;
  }
  var Put = new PutClass(db, self.settings, jsonData, requestDetails);
  Put.process(function(err, handlerAnswer) {
    self.currentRequests--
    callback(err, handlerAnswer)
    if(self.isTerminate && self.currentRequests === 0 ) {
      self.debug.log('Close mongo connection');
      self.mongoDB.close()
    }
  });
  return Put;

};

/**
 * Process Get request.
 */
Microservice.prototype.delete = function(jsonData, requestDetails, callback) {
  var self = this;

  if (arguments.length === 2) {
    // v1.3 < version compatibility
    callback = requestDetails;
    requestDetails = jsonData;
  }
  let db = false;
  self.currentRequests++
  if (requestDetails.mongoDatabase) {
    db = self.mongoDB.db(requestDetails.mongoDatabase);
  } else {
    db = self.mongoDB;
  }
  var Delete = new DeleteClass(db, self.settings, requestDetails);
  Delete.process(function(err, handlerAnswer) {
    self.currentRequests--
    callback(err, handlerAnswer)
    if(self.isTerminate && self.currentRequests === 0 ) {
      self.debug.log('Close mongo connection');
      self.mongoDB.close()
    }
  });
  return Delete;

};

/**
 * Process SEARCH request.
 */
Microservice.prototype.search = function(jsonData, requestDetails, callback) {
  var self = this;
  let db = false;
  self.currentRequests++
  if (requestDetails.mongoDatabase) {
    db = self.mongoDB.db(requestDetails.mongoDatabase);
  } else {
    db = self.mongoDB;
  }
  var Search = new SearchClass(db, self.settings, jsonData, requestDetails);
  Search.process(function(err, handlerAnswer) {
    self.currentRequests--
    callback(err, handlerAnswer)
    if(self.isTerminate && self.currentRequests === 0 ) {
      self.debug.log('Close mongo connection');
      self.mongoDB.close()
    }
  });
  return Search;

};

/**
 * Process OPTIONS request.
 */
Microservice.prototype.options = function(jsonData, requestDetails, callbacks, callback) {
  var self = this;

  if (arguments.length === 3) {
    // v1.3 < version compatibility
    callback = callbacks;
    callbacks = requestDetails;
    requestDetails = jsonData;
  }


  var Options = new OptionsClass(self.settings, callbacks, requestDetails);
  Options.process(callback);
  return Options;

};

/**
 * Process SEARCH request.
 */
Microservice.prototype.aggregate = function(jsonData, requestDetails, callback) {
  var self = this;
  let db = false;
  self.currentRequests++
  if (requestDetails.mongoDatabase) {
    db = self.mongoDB.db(requestDetails.mongoDatabase);
  } else {
    db = self.mongoDB;
  }
  var Aggregate = new AggregateClass(db, self.settings, jsonData, requestDetails);
  Aggregate.process(function(err, handlerAnswer) {
    self.currentRequests--
    callback(err, handlerAnswer)
    if(self.isTerminate && self.currentRequests === 0 ) {
      self.debug.log('Close mongo connection');
      self.mongoDB.close()
    }
  });
  return Aggregate;

};

/**
 * Process Get request.
 */
Microservice.prototype.validateJson = function(jsonData) {
  var self = this;

  var v = new Validator();
  try {
    var schemaTask = JSON.parse(fs.readFileSync('schema/' + self.settings.schema));
  } catch (e) {
    self.debug.debug('validateJson:Validator %O', e);
    throw new Error('Internal error: schema syntax error.');
  }
  var result = v.validate(jsonData, schemaTask);
  if (result.errors.length > 0) {
    var errors = [];
    for (var errorNum in result.errors) {
      errors.push(result.errors[ errorNum ].property + ' ' + result.errors[ errorNum ].message);
    }
    return errors;
  }
  return true;

};

module.exports = Microservice;
