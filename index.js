/**
 * Process JSON validation and execute tasks.
 * Parse request and s
 */
'use strict';

var Validator = require('jsonschema').Validator;
var LogStore = require('./includes/zenci-log-store.js');
var LogUpdate = require('./includes/zenci-log-update.js');
var LogGet = require('./includes/zenci-log-get.js');
var LogDelete = require('./includes/zenci-log-delete.js');
var LogValidate = require('./includes/zenci-log-validate.js');
var LogSearch = require('./includes/zenci-log-search.js');
const fs = require('fs');

const bind = function(fn, me) { return function() { return fn.apply(me, arguments); }; };

/**
 * Constructor of ZenciMicroservice object.
 *   .
 *   settings.mongoUrl = process.env.MONGO_URL;
 *   settings.mongoTable = process.env.MONGO_TABLE;
 *   settings.secureKey = process.env.SECURE_KEY;
 *   settings.fileDir = process.env.FILE_DIR
 *   settings.schema = process.env.SCHEMA
 */
function ZenciMicroservice(settings) {

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
ZenciMicroservice.prototype.settings = {};

/**
 * Validate data by method.
 */
ZenciMicroservice.prototype.validate = function(method, jsonData, requestDetails, callback) {
  var self = this;

  var Validate = new LogValidate(self.settings, jsonData, requestDetails);
  Validate.validate(method, callback);
  return Validate;
};

/**
 * Process Get request.
 */
ZenciMicroservice.prototype.get = function(jsonData, requestDetails, callback) {
  var self = this;

  var Task = new LogGet(self.settings, jsonData, requestDetails);
  Task.process(callback);
  return Task;

};

/**
 * Process Get request.
 */
ZenciMicroservice.prototype.post = function(jsonData, requestDetails, callback) {
  var self = this;

  var errors = self.validateJson(jsonData);
  if (true !== errors) {
    callback(new Error(errors));
  }
  var Task = new LogStore(self.settings, jsonData);
  Task.process(callback);
  return Task;

};

/**
 * Process PUT request.
 */
ZenciMicroservice.prototype.put = function(jsonData, requestDetails, callback) {
  var self = this;

  var Task = new LogUpdate(self.settings, jsonData, requestDetails);
  Task.process(callback);
  return Task;

};

/**
 * Process Get request.
 */
ZenciMicroservice.prototype.delete = function(jsonData, requestDetails, callback) {
  var self = this;

  var Task = new LogDelete(self.settings, jsonData, requestDetails);
  Task.process(callback);
  return Task;

};

/**
 * Process SEARCH request.
 */
ZenciMicroservice.prototype.search = function(jsonData, requestDetails, callback) {
  var self = this;

  var Task = new LogSearch(self.settings, jsonData, requestDetails);
  Task.process(callback);
  return Task;

};


/**
 * Process Get request.
 */
ZenciMicroservice.prototype.validateJson = function(jsonData) {
  var self = this;

  var v = new Validator();
  try {
    var schemaTask = JSON.parse(fs.readFileSync('schema/' + self.settings.schema));
  } catch (e) {
    console.log(e);
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

module.exports = ZenciMicroservice;
