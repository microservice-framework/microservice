/**
 * Process Test task.
 */
"use strict";

require('dotenv').config();
const MongoClient = require('mongodb').MongoClient;
const debugF = require( "debug" );

const bind = function( fn, me ) { return function() { return fn.apply( me, arguments ); }; };

/**
 * Constructor.
 *   Prepare data for test.
 */
function Log( data ) {
  // Use a closure to preserve `this`
  var self = this;
  self.mongo_url = process.env.MONGO_URL
  this.status = bind( this.status, this );
  // Save original data
  this.data = data;
}

Log.prototype.data = {};
Log.prototype.record = "";
Log.prototype.mongo_url = "";


Log.prototype.debug = {
  main: debugF( "status:main" ),
};

Log.prototype.status = function(callback) {
  console.log(this.data);
  var self = this;

  MongoClient.connect(self.mongo_url, function(err, db) {
    if(! err) {
      console.log("Connected correctly to server");
      var collection = db.collection('tasks');
      collection.insertOne(self.data, function(err, result) {
        if(!err) {
          console.log("Inserted data into the document collection");
          console.log(result);
          db.close();
          callback(null, {
            code: 200,
            answer: {
              message: 'Task accepted',
              id: result.insertedId,
            }
          });
        } else {
          db.close();
          callback(err, null);
        }
      });
    } else {
      callback(err, null);
    }
  });
  return;
}

module.exports = Log;
