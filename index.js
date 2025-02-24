import debug from 'debug';
import { MongoClient } from 'mongodb';
import { EventEmitter } from 'node:events';
import { Validator } from 'jsonschema';

import validate from './includes/validate.js';
import get from './includes/get.js';
import post from './includes/post.js';
import put from './includes/put.js';
import del from './includes/delete.js';
import search from './includes/search.js';
//import aggregate from './includes/aggregate';
import options from './includes/options.js';

function Microservice(settings) {
  console.log('Micro');
  this.mongoDB = false;
  this.isTerminate = false;
  this.currentRequests = 0;
  this.settings = settings;
  var self = this
  //this.validate = bind(self.validate, self)
  //this.debug.log('Microservice %O', this.settings);

  EventEmitter.call(this); // Call EventEmitter constructor
  this.init();
  return this;
}

// Inherit from EventEmitter
Object.setPrototypeOf(Microservice.prototype, EventEmitter.prototype);

Microservice.prototype.init = function () {
  if (this.settings.mongoUrl) {
    try{
      this.mongoDB = new MongoClient(this.settings.mongoUrl);
      this.emit('ready', this.mongoDB);
      process.on('SIGINT', () => {
        this.debug.log('SIGINT received');
        this.isTerminate = true;
        this.close();
      });
      // On sigterm close database connection immediately
      process.on('SIGTERM', () => {
        this.debug.log('SIGTERM received');
        this.mongoDB.close();
      });
    } catch (err){
      this.debug.debug('MongoClient:connect err: %O', err);
      this.debug.log('MongoClient:connect failed');
      this.emit('error', err);
    }
  }
}
Microservice.prototype.close = function () {
  if (this.isTerminate && this.currentRequests === 0) {
    this.debug.log('Close mongo connection');
    this.mongoDB.close();
  }
}

Microservice.prototype.validate = validate
Microservice.prototype.get = get
Microservice.prototype.delete = del
Microservice.prototype.put = put
Microservice.prototype.post = post
Microservice.prototype.search = search
Microservice.prototype.options = options


/**
 * Process Get request.
 */
Microservice.prototype.validateJson = function (jsonData) {
  var v = new Validator();
  try {
    var schemaTask = JSON.parse(fs.readFileSync('schema/' + this.settings.schema));
  } catch (e) {
    this.debug.debug('validateJson:Validator %O', e);
    throw new Error('Internal error: schema syntax error.');
  }
  var result = v.validate(jsonData, schemaTask);
  if (result.errors.length > 0) {
    var errors = [];
    for (var errorNum in result.errors) {
      errors.push(result.errors[errorNum].property + ' ' + result.errors[errorNum].message);
    }
    return errors;
  }
  return true;
};


Microservice.prototype.debug = {
  debug: debug('microservice:debug'),
  log: debug('microservice:log'),
};

export default Microservice;
