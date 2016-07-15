/**
 * Central Startup file.
 * Launch cluster and workers.
 * React on SIGINT and SIGTERM.
 * restart worker if worker exit.
 */
"use strict";

var Cluster = require( "zenci-manager" );
var handler = require( "./includes/handler.js" );

var mcluster = new Cluster( {
  port: 4000,
  callbacks: {
    post: handler.post,
    get: handler.get
  }
} );