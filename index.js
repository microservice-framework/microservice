/**
 * Process JSON validation and execute tasks.
 * Parse request and s
 */
'use strict';

const Validator = require('jsonschema').Validator;
const MongoClient = require('mongodb').MongoClient;
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
  self.settings.mongoDB = false;

  if (self.settings.mongoUrl) {
    MongoClient.connect(self.mongoUrl, function(err, db) {
      if (err) {
        self.debug.debug('MongoClient:connect err: %O', err);
        self.debug.log('MongoClient:connect failed');
        return;
      }
      self.settings.mongoDB = db;
    });
  }
}

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

  var errors = self.validateJson(jsonData);
  if (true !== errors) {
    var error = new Error;
    error.message = errors.join();
    self.debug.debug('POST:validateJson %O', error);
    return callback(error);
  }
  var Post = new PostClass(self.settings, jsonData, requestDetails);
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
 * Process OPTIONS request.
 */
Microservice.prototype.options = function(jsonData, requestDetails, callbacks, callback) {
  var self = this;

  var Options = new OptionsClass(self.settings, jsonData, callbacks, requestDetails);
  Options.process(callback);
  return Options;

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
