/**
 * Process Test task.
 */
'use strict';

const fs = require('fs');
const debugF = require('debug');

/**
 * Constructor.
 *   Prepare data for test.
 */
function OptionsClass(options, data, callbacks, requestDetails) {
  var self = this;
  self.data = data;
  self.callbacks = callbacks;
  self.options = options;
  self.requestDetails = requestDetails;

}

OptionsClass.prototype.debug = {
  options: debugF('microservice:options')
};


OptionsClass.prototype.process = function(callback) {
  var self = this;
  try {
    var schemaTask = JSON.parse(fs.readFileSync('schema/' + self.settings.schema));
  } catch (e) {
    self.debug.options('Failed to read schema file: %O', e);
    return callback(new Error('Failed to read schema file.'));
  }
  let answer = {
    methods: {},
    properties: schemaTask.properties
  };
  if (self.options.mongoTable && self.options.mongoTable != '') {
    answer.properties['created'] = {
      type: 'number',
      description: 'Will be added on CREATE(POST).'
        + '\nThe number of milliseconds elapsed since 1 January 1970 00:00:00 UTC'
    };
    answer.properties['changed'] = {
      type: 'number',
      description: 'Will be added on CREATE(POST) and updated on UPDATE(PUT).'
        + '\nThe number of milliseconds elapsed since 1 January 1970 00:00:00 UTC'
    };
  }
  let recordTitle = 'record';
  if (process.env.SCOPE) {
    recordTitle = process.env.SCOPE;
  }
  for (let method in self.callbacks) {
    if (self.requestDetails.auth_methods) {
      if (!self.requestDetails.auth_methods[method.toLowerCase()]) {
        self.debug.options('Access Token has no access to method: %s', method);
        continue;
      }
    }
    switch (method) {
      case 'POST': {
        answer['methods']['POST'] = {
          description: 'Create ' + recordTitle
        };
        break;
      }
      case 'GET': {
        answer['methods']['GET'] = {
          description: 'Read ' + recordTitle
        };
        break;
      }
      case 'PUT': {
        answer['methods']['PUT'] = {
          description: 'Update ' + recordTitle
        };
        break;
      }
      case 'DELETE': {
        answer['methods']['DELETE'] = {
          description: 'Delete ' + recordTitle
        };
        break;
      }
      case 'SEARCH': {
        answer['methods']['SEARCH'] = {
          description: 'Search. \nSupport extra properties:'
           + '\n skip, limit, sort, query. Query support basic Mongo find syntax.'
        };
        break;
      }
    }
  }
};
module.exports = OptionsClass;
