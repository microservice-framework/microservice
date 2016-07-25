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
const fs = require('fs');

/**
 * Constructor.
 *   Prepare data for test.
 */
function ZenciStatus(options) {

  // Use a closure to preserve `this`
  var self = this;

  self.options = options;

  //  Self.options.mongoUrl = process.env.MONGO_URL;
  //  self.options.mongoTable = process.env.MONGO_TABLE;
  //  self.options.secureKey = process.env.SECURE_KEY;
  //  self.options.fileDir = process.env.FILE_DIR
  //  self.options.schema = process.env.SCHEMA
}

/**
 * Settings for microservice.
 */
ZenciStatus.prototype.options = {};

/**
 * Validate data by method.
 */
ZenciStatus.prototype.validate = function(method, jsonData, requestDetails, callback) {
  var self = this;

  var Validate = new LogValidate(self.options, jsonData, requestDetails);
  Validate.validate(method, callback);
  return Validate;
};

/**
 * Process Get request.
 */
ZenciStatus.prototype.get = function(jsonData, requestDetails, callback) {
  var self = this;

  var Task = new LogGet(self.options, jsonData, requestDetails);
  Task.process(callback);
  return Task;

};

/**
 * Process Get request.
 */
ZenciStatus.prototype.post = function(jsonData, requestDetails, callback) {
  var self = this;

  var errors = self.validateJson(jsonData);
  if (true !== errors) {
    callback(new Error(errors));
  }
  var Task = new LogStore(self.options, jsonData);
  Task.process(callback);
  return Task;

};

/**
 * Process PUT request.
 */
ZenciStatus.prototype.put = function(jsonData, requestDetails, callback) {
  var self = this;

  var errors = self.validateJson(jsonData);
  if (true !== errors) {
    callback(new Error(errors));
  }
  var Task = new LogUpdate(self.options, jsonData, requestDetails);
  Task.process(callback);
  return Task;

};

/**
 * Process Get request.
 */
ZenciStatus.prototype.delete = function(jsonData, requestDetails, callback) {
  var self = this;

  var Task = new LogDelete(self.options, jsonData, requestDetails);
  Task.process(callback);
  return Task;

};

/**
 * Process Get request.
 */
ZenciStatus.prototype.validateJson = function(jsonData) {
  var v = new Validator();
  try {
    var schemaTask = JSON.parse(fs.readFileSync('schema/' + self.options.schema));
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

module.exports = ZenciStatus;
