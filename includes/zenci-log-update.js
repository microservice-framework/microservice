/**
 * Process Test task.
 */
"use strict";

const MongoClient = require( "mongodb" ).MongoClient;
const ObjectID = require( "mongodb" ).ObjectID;
const debugF = require( "debug" );
const fs = require( "fs" );

require( "dotenv" ).config();
const bind = function( fn, me ) { return function() { return fn.apply( me, arguments ); }; };

/**
 * Constructor.
 *   Prepare data for test.
 */
function LogUpdate( data, requestDetails ) {

  // Use a closure to preserve `this`
  var self = this;
  self.mongoUrl = process.env.MONGO_URL;
  self.mongoTable = process.env.MONGO_TABLE;
  this.status = bind( this.status, this );
  this.data = data;
  this.requestDetails = requestDetails;
  self.fileDir = process.env.FILE_DIR + "/" + data.owner + "/" + data.repository;
}

LogUpdate.prototype.data = {};
LogUpdate.prototype.requestDetails = {};
LogUpdate.prototype.fileDir = "";
LogUpdate.prototype.mongoUrl = "";
LogUpdate.prototype.mongoTable = "";

LogUpdate.prototype.debug = {
  main: debugF( "status:main" )
};

LogUpdate.prototype.status = function( callback ) {
  var self = this;

  if ( self.requestDetails.url.length != 24 ) {
    callback( null, {
      code: 403,
      answer: {
        message: "Wrong request"
      }
    } );
    return;
  }

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
            callback( null, {
              code: 404,
              answer: {
                message: "Not found"
              }
            } );
          } else {
            var record = resultFind;
            // If status already not pending, just save a log file.
            if(record.status != "pending" ) {
              db.close();
              if ( log ) {
                fs.writeFile( self.fileDir + "/" + self.requestDetails.url, log );
              }
              record.log = log;
              callback( null, {
                code: 200,
                answer: record
              } );
              return;
            }

            // Get all new data to keep all fields. Like created.
            for ( var key in self.data ) {
              if( key == "token" ) {
                return callback( null, {
                    code: 403,
                    answer: {
                      message: "Malformed request"
                    }
                  } );
              }
              record[key] = self.data[key];
            }

            // update changed field.
            record.changed = Date.now();
            collection.findOneAndUpdate( query, record, { returnOriginal: false}, function( err, resultUpdate ) {
              db.close();
              if ( !err ) {
                if ( !resultUpdate ) {
                  callback( null, {
                    code: 404,
                    answer: {
                      message: "Not found"
                    }
                  } );
                } else {
                  if ( !resultUpdate.value ) {
                    callback( null, {
                      code: 503,
                      message: "Error to save data"
                    } );
                  } else {
                    if ( log ) {
                      fs.writeFile( self.fileDir + "/" + self.requestDetails.url, log );
                    }
                    callback( null, {
                      code: 200,
                      answer: resultUpdate.value
                    } );
                  }
                }
              } else {
                callback( err, null );
              }
            } );
          }
        } else {
          db.close();
          callback( err, null );
        }
      } );
    } else {
      callback( err, null );
    }
  } );
  return;
};

module.exports = LogUpdate;
