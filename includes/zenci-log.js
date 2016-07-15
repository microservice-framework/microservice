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
function Log( data ) {
  // Use a closure to preserve `this`
  var self = this;
  self.namespace = process.env.NAMESPACE;
  self.datastore = gcloud.datastore({
    projectId: process.env.PROJECTID,
    keyFilename: './settings/keyfile.json'
  });

  this.status = bind( this.status, this );
  // Save original data
  this._data = JSON.parse( JSON.stringify( data ) );
  this.data = data;
  this.save();
}

Log.prototype.data = {};
Log.prototype.datastore = false;
Log.prototype.record = {};
Log.prototype.namespace = "";


Log.prototype.debug = {
  main: debugF( "status:main" ),
};

Log.prototype.save = function() {
  console.log(this.data);
}

Log.prototype.status = function(callback) {
  callback(null, {
    code: 200,
    answer: {
      message: 'Task accepted'
    }
  });
}

module.exports = Log;
