/**
 * Central Startup file.
 * Launch cluster and workers.
 * React on SIGINT and SIGTERM.
 * restart worker if worker exit.
 */
"use strict";

var Cluster = require( "zenci-manager" );
var handler = require( "../zenci-status.js" );
require( "dotenv" ).config();

var mcluster = new Cluster( {
  port: process.env.PORT,
  callbacks: {
    validate: handler.validate,
    post: handler.post,
    get: handler.get,
    put: handler.put,
    delete: handler.delete
  }
} );
