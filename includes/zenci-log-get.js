/**
 * Process Test task.
 */
"use strict";

const gcloud = require('gcloud');
require('dotenv').config();
const bind = function( fn, me ) { return function() { return fn.apply( me, arguments ); }; };

// Debug module.
const debugF = require( "debug" );

/**
 * Constructor.
 *   Prepare data for test.
 */
function LogGet( data ) {
  // Use a closure to preserve `this`
  var self = this;
  self.namespace = process.env.NAMESPACE;
  self.datastore = gcloud.datastore({
    projectId: process.env.PROJECTID,
    keyFilename: './settings/keyfile.json'
  });

  this.status = bind( this.status, this );
  // Save original data
  this.data = data;
}

LogGet.prototype.data = {};
LogGet.prototype.datastore = false;
LogGet.prototype.record = "";
LogGet.prototype.namespace = "";


LogGet.prototype.debug = {
  main: debugF( "status:main" ),
};

LogGet.prototype.status = function(callback) {
  console.log(this.data);
  var self = this;
  var recordID = new Date().getTime();
  var TaskLogKey = self.datastore.key({
    namespace: self.namespace,
    path: ['TaskLog', parseInt(this.data._url) ]
  });

  self.datastore.get(TaskLogKey, function(err, entity) {
    if (!err) {
        callback(null, {
          code: 200,
          answer: entity
        });
      } else {
        callback(err, null);
      }
    console.log(err || entity);
  });
}

module.exports = LogGet;
