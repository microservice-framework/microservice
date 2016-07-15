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
  this.data = data;
  this.save();
}

Log.prototype.data = {};
Log.prototype.datastore = false;
Log.prototype.record = "";
Log.prototype.namespace = "";


Log.prototype.debug = {
  main: debugF( "status:main" ),
};

Log.prototype.save = function() {

}

Log.prototype.status = function(callback) {
  console.log(this.data);
  var self = this;
  var recordID = new Date().getTime();
  var TaskLogKey = self.datastore.key({
    namespace: self.namespace,
    path: ['TaskLog', recordID ]
  });

  var record  =  [
    {
      name: 'owner',
      value: self.data.owner
    },
    {
      name: 'repository',
      value: self.data.repository
    },
    {
      name: 'status',
      value: self.data.status
    },
    {
      name: 'description',
      value: self.data.description
    },
    {
      name: 'summary',
      value: self.data.summary
    },
    {
      name: 'sha',
      value: self.data.sha
    },
    {
      name: 'branch',
      value: self.data.branch
    },
    {
      name: 'context',
      value: self.data.context
    },
    {
      name: 'created',
      value: new Date()
    },
    {
      name: 'changed',
      value: new Date()
    },
    {
      name: 'interrupt',
      value: self.data.interrupt
    },
    {
      name: 'command_log',
      value: '',
      excludeFromIndexes: true
    }
  ];
  self.datastore.save({
    method: 'insert',
    key: TaskLogKey,
    data: record
  }, function (err) {
    if (!err) {
      self.record = recordID;
      callback(null, {
        code: 200,
        answer: {
          message: 'Task accepted',
          id: recordID
        }
      });
    } else {
      callback(err, null);
    }
  })
}

module.exports = Log;
