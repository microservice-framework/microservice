/**
 * Process Test task.
 */
'use strict';

const EventEmitter = require('events').EventEmitter;
const util = require('util');
const MicroserviceClient = require('@microservice-framework/microservice-client');

/**
 * Constructor.
 *   Prepare data for test.
 */
function LoaderClass(headers) {
  EventEmitter.call(this);
  var self = this;
  self.headers = headers;
  self.preLoad = [];
  self.errorResult = [];
  self.okResult = {};
  self.processedCount = 0;
  for (var name in self.headers) {
    if (name.substr(0, 4) == 'mfw-') {
      self.preLoad.push({
        name: name.substr(4),
        value: self.headers[name]
      });
    }
  }
  self.on('itemError', function(err, pairSearch) {
    self.errorResult.push({
      error: err,
      pairSearch: pairSearch
    });
    self.processedCount = self.processedCount + 1;
    if (self.processedCount == self.preLoad.length) {
      self.emit('error', self.errorResult);
    }
  });
  self.on('itemOk', function(pairSearch, searchResult) {
    self.okResult[pairSearch.name] = searchResult;
    self.processedCount = self.processedCount + 1;
    if (self.processedCount == self.preLoad.length) {
      if (self.errorResult.length > 0) {
        self.emit('error', self.errorResult);
      } else {
        self.emit('done', self.okResult);
      }
    }
  });
}

/**
 * Check module status.
 *
 * @param {object} module - module data.
 */
LoaderClass.prototype.process = function() {
  var self = this;
  if (self.preLoad.length == 0) {
    return self.emit('done', false);
  }
  for (var i in self.preLoad) {
    var pairSearch = self.preLoad[i];
    self.processPair(pairSearch);
  }

}

/**
 * Wrapper to get secure access to service by path.
 */
LoaderClass.prototype.processPair = function(pairSearch) {
  var self = this;
  self.getLoader(pairSearch.name, function(err, client, searchBy) {
    if (err) {
      return self.emit('itemError', err, pairSearch);
    }
    var searchQuery = {};
    searchQuery[searchBy] = pairSearch.value;
    client.search(searchQuery, function(err, searchResult) {
      if (err) {
        return self.emit('itemError', err, pairSearch);
      }
      self.emit('itemOk', pairSearch, searchResult[0]);
    });
  });
}

/**
 * Wrapper to get secure access to service by path.
 */
LoaderClass.prototype.getLoader = function(name, callback) {
  var self = this;
  let routerServer = new MicroserviceClient({
    URL: process.env.ROUTER_URL,
    secureKey: process.env.ROUTER_SECRET
  });
  var searchQuery = {};
  searchQuery['provides.:' + name] = {
    $exists: true
  }

  routerServer.search(searchQuery, function(err, routes) {
      if (err) {
        return callback(err);
      }
      var clientSettings = {
        URL: process.env.ROUTER_PROXY_URL + '/' + routes[0].path[0]
      }
      if (self.headers.access_token) {
        clientSettings.accessToken = self.headers.access_token;
      } else {
        clientSettings.secureKey = routes[0].secureKey;
      }
      let msClient = new MicroserviceClient(clientSettings);
      callback(null, msClient, routes[0].provides[':' + name]);
    });
}

util.inherits(LoaderClass, EventEmitter);

module.exports = LoaderClass;
