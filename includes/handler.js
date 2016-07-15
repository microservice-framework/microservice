/**
 * Process JSON validation and execute tasks.
 * Parse request and s
 */
"use strict";

var Validator = require( "jsonschema" ).Validator;
var LogStore = require( "./zenci-log-store.js" );

module.exports = {
  post: function( jsonData, callback ) {
    var errors = validateJson( jsonData );
    if ( true !== errors ) {
      throw new Error( errors );
    }
    var Task = new LogStore( jsonData );
    Task.status(callback);
    return Task;
  },
  get: function( jsonData, callback ) {
    return Task;
  },
};

function validateJson( jsonData ) {
  var v = new Validator();
  try {
    var schemaTask = require( "../schema/status.json" );
  } catch ( e ) {
    console.log( e );
    throw new Error( "Internal error: schema syntax error." );
  }
  var result = v.validate( jsonData, schemaTask );
  if ( result.errors.length > 0 ) {
    var errors = [];
    for ( var errorNum in result.errors ) {
      errors.push( result.errors[ errorNum ].property + " " + result.errors[ errorNum ].message );
    }
    return errors;
  }
  return true;
}