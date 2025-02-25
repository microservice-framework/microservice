/**
 * Process Test task.
 */
'use strict';
export default async function (data, requestDetails, methods) {
  let answer = {
    id: {
      title: 'ID',
      field: 'id',
      type: 'string',
      description: 'Generated record ID',
    },
    methods: {},
    version: process.env.npm_package_version,
    description: process.env.npm_package_description,
  };
  if (this.schema) {
    try {
      var schemaTask = JSON.parse(fs.readFileSync('schema/' + this.schema));
      answer.properties = schemaTask.properties;
    } catch (e) {
      this.debug.options('Failed to read schema file: %O', e);
      return {
        code: 500,
        answer: new Error('Failed to read schema file.'),
      };
    }
  }
  if (this.settings.id) {
    answer.id = this.settings.id;
  }
  // Add required fields to schema based on activated or disabled mongo
  if (this.mongoTable && this.mongoTable != '') {
    answer.properties['created'] = {
      type: 'number',
      description: 'Will be added on CREATE(POST).' + '\nThe number of milliseconds elapsed since 1 January 1970 00:00:00 UTC',
    };
    answer.properties['changed'] = {
      type: 'number',
      description:
        'Will be added on CREATE(POST) and updated on UPDATE(PUT).' + '\nThe number of milliseconds elapsed since 1 January 1970 00:00:00 UTC',
    };
  }
  let recordTitle = 'record';
  if (process.env.SCOPE) {
    recordTitle = process.env.SCOPE;
  }
  for (let method in methods) {
    if (requestDetails.auth_methods) {
      if (!requestDetails.auth_methods[method.toLowerCase()]) {
        this.debug.options('Access Token has no access to method: %s', method);
        continue;
      }
    }
    switch (method) {
      case 'POST': {
        answer['methods']['POST'] = {
          description: 'Create ' + recordTitle,
        };
        break;
      }
      case 'GET': {
        answer['methods']['GET'] = {
          description: 'Read ' + recordTitle,
        };
        break;
      }
      case 'PUT': {
        answer['methods']['PUT'] = {
          description: 'Update ' + recordTitle,
        };
        break;
      }
      case 'DELETE': {
        answer['methods']['DELETE'] = {
          description: 'Delete ' + recordTitle,
        };
        break;
      }
      case 'SEARCH': {
        answer['methods']['SEARCH'] = {
          description: 'Search. \nSupport extra properties:' + '\n skip, limit, sort, query. Query support basic Mongo find syntax.',
        };
        break;
      }
    }
  }
  return {
    code: 200,
    answer: answer,
  };
}
