/**
 * Process JSON validation and execute tasks.
 * Parse request and s
 */
"use strict";

var Validator = require( "jsonschema" ).Validator;
var LogStore = require( "./includes/zenci-log-store.js" );
var LogUpdate = require( "./includes/zenci-log-update.js" );
var LogGet = require( "./includes/zenci-log-get.js" );
var LogDelete = require( "./includes/zenci-log-delete.js" );
var LogValidate = require( "./includes/zenci-log-validate.js" );
const fs = require( "fs" );

require( "dotenv" ).config();

module.exports = {
  validate: function( method, jsonData, requestDetails, callback ) {
    var Validate = new LogValidate( jsonData, requestDetails );
    Validate.validate( method, callback );
    return Validate;
  },
  get: function( jsonData, requestDetails, callback ) {
    var Task = new LogGet( jsonData, requestDetails );
    Task.status( callback );
    return Task;

  },
  post: function( jsonData, requestDetails, callback ) {
    var errors = validateJson( jsonData );
    if ( true !== errors ) {
      throw new Error( errors );
    }
    var Task = new LogStore( jsonData );
    Task.status( callback );
    return Task;
  },
  put: function( jsonData, requestDetails, callback ) {
    var errors = validateJson( jsonData );
    if ( true !== errors ) {
      throw new Error( errors );
    }
    var Task = new LogUpdate( jsonData, requestDetails );
    Task.status( callback );
    return Task;
  },
  delete: function( jsonData, requestDetails, callback ) {
    var Task = new LogDelete( jsonData, requestDetails );
    Task.status( callback );
    return Task;
  }
};

function validateJson( jsonData ) {
  var v = new Validator();
  try {
    var schemaTask = JSON.parse(fs.readFileSync( "schema/" + process.env.SCHEMA ));
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
