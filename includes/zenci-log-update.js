/**
 * Process Test task.
 */
"use strict";

const MongoClient = require( "mongodb" ).MongoClient;
const ObjectID = require( "mongodb" ).ObjectID;
const debugF = require( "debug" );
const fs = require( "fs" );

/**
 * Constructor.
 *   Prepare data for test.
 */
function LogUpdate( options, data, requestDetails ) {

  // Use a closure to preserve `this`
  var self = this;
  self.mongoUrl = options.mongoUrl;
  self.mongoTable = options.mongoTable;
  self.fileDir = options.fileDir;

  this.data = data;
  this.requestDetails = requestDetails;
  if(self.fileDir && self.fileDir != '') {
    self.fileDir = self.fileDir + "/" + data.owner + "/" + data.repository;
  }
}

LogUpdate.prototype.data = {};
LogUpdate.prototype.requestDetails = {};
LogUpdate.prototype.fileDir = "";
LogUpdate.prototype.mongoUrl = "";
LogUpdate.prototype.mongoTable = "";

LogUpdate.prototype.debug = {
  main: debugF( "status:main" )
};

LogUpdate.prototype.process = function( callback ) {
  var self = this;

  var log = JSON.stringify( self.data.log );
  delete( self.data.log );

  MongoClient.connect( self.mongoUrl, function( err, db ) {
    if ( !err ) {
      var collection = db.collection( self.mongoTable );
      var query = {
        _id: new ObjectID( self.requestDetails.url )
      };
      collection.findOne( query, function( err, resultFind ) {
        if ( !err ) {
          if ( !resultFind ) {
            return callback( null, {
              code: 404,
              answer: {
                message: "Not found"
              }
            } );
          } else {
            var record = resultFind;

            // If status already not pending, just save a log file.
            if ( record.status != "pending" ) {
              db.close();
              if ( log && self.fileDir ) {
                fs.writeFile( self.fileDir + "/" + self.requestDetails.url, log );
              }
              record.log = log;
              return callback( null, {
                code: 200,
                answer: record
              } );
            }

            // Get all new data to keep all fields. Like created.
            // Update should ignore token
            for ( var key in self.data ) {
              if ( key != "token" ) {
                record[ key ] = self.data[ key ];
              }
            }

            // Update changed field.
            record.changed = Date.now();
            collection.findOneAndUpdate( query, record, { returnOriginal: false },
              function( err, resultUpdate ) {
              db.close();
              if ( !err ) {
                if ( !resultUpdate ) {
                  return callback( null, {
                    code: 404,
                    answer: {
                      message: "Not found"
                    }
                  } );
                } else {
                  if ( !resultUpdate.value ) {
                    return callback( null, {
                      code: 503,
                      message: "Error to save data"
                    } );
                  } else {
                    if ( log ) {
                      fs.writeFile( self.fileDir + "/" + self.requestDetails.url, log );
                    }
                    return callback( null, {
                      code: 200,
                      answer: resultUpdate.value
                    } );
                  }
                }
              } else {
                return callback( err, null );
              }
            } );
          }
        } else {
          db.close();
          return callback( err, null );
        }
      } );
    } else {
      return callback( err, null );
    }
  } );
  return;
};

module.exports = LogUpdate;
