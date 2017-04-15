/**
 * Process JSON validation and execute tasks.
 * Parse request and s
 */
'use strict';

var Validator = require('jsonschema').Validator;
var PostClass = require('./includes/postClass.js');
var PutClass = require('./includes/putClass.js');
var GetClass = require('./includes/getClass.js');
var DeleteClass = require('./includes/deleteClass.js');
var ValidateClass = require('./includes/validateClass.js');
var SearchClass = require('./includes/searchClass.js');
var AggregateClass = require('./includes/aggregateClass.js');
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
  //  self.settings.mongoUrl = process.env.MONGO_URL;
  //  self.settings.mongoTable = process.env.MONGO_TABLE;
  //  self.settings.secureKey = process.env.SECURE_KEY;
  //  self.settings.fileDir = process.env.FILE_DIR
  //  self.settings.schema = process.env.SCHEMA
}

/**
 * Settings for microservice.
 */
Microservice.prototype.settings = {};

Microservice.prototype.debug = {
  debug: debugF('microservice:debug')
};

/**
 * Validate data by method.
 */
Microservice.prototype.validate = function(method, jsonData, requestDetails, callback) {
  var self = this;

  var Validate = new ValidateClass(self.settings, jsonData, requestDetails);
  Validate.validate(method, callback);
  return Validate;
};

/**
 * Process Get request.
 */
Microservice.prototype.get = function(jsonData, requestDetails, callback) {
  var self = this;

  var Get = new GetClass(self.settings, jsonData, requestDetails);
  Get.process(callback);
  return Get;

};

/**
 * Process Get request.
 */
Microservice.prototype.post = function(jsonData, requestDetails, callback) {
  var self = this;

  // If auth_scope active, auto add variables.
  if (requestDetails.auth_scope) {
    for (var i in requestDetails.auth_scope) {
      jsonData[i] = requestDetails.auth_scope[i];
    }
  }

  var errors = self.validateJson(jsonData);
  if (true !== errors) {
    var error = new Error;
    error.message = errors.join();
    self.debug.debug('POST:validateJson %O', error);
    return callback(error);
  }
  var Post = new PostClass(self.settings, jsonData);
  Post.process(callback);
  return Post;

};

/**
 * Process PUT request.
 */
Microservice.prototype.put = function(jsonData, requestDetails, callback) {
  var self = this;

  var Put = new PutClass(self.settings, jsonData, requestDetails);
  Put.process(callback);
  return Put;

};

/**
 * Process Get request.
 */
Microservice.prototype.delete = function(jsonData, requestDetails, callback) {
  var self = this;

  var Delete = new DeleteClass(self.settings, jsonData, requestDetails);
  Delete.process(callback);
  return Delete;

};

/**
 * Process SEARCH request.
 */
Microservice.prototype.search = function(jsonData, requestDetails, callback) {
  var self = this;

  var Search = new SearchClass(self.settings, jsonData, requestDetails);
  Search.process(callback);
  return Search;

};

/**
 * Process SEARCH request.
 */
Microservice.prototype.aggregate = function(jsonData, requestDetails, callback) {
  var self = this;

  var Aggregate = new AggregateClass(self.settings, jsonData, requestDetails);
  Aggregate.process(callback);
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
