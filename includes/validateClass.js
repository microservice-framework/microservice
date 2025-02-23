/**
 * Process Test task.
 */
'use strict';

import signature from './signature.js';
import { ObjectId } from 'mongodb';
import microserviceClient from '@microservice-framework/microservice-client';

export default async function(method, data, requestDetails) {
  let TokenSystem = async () => {
    this.debug.debug('Validate:TokenSystem');
  
    if (!this.mongoDB) {
      this.debug.debug('MongoClient:db is not ready');
      return new Error('DB is not ready');
    }

    let collection = this.mongoDB.collection(this.mongoTable);
  
    let query = {};
    if (this.id && this.id.field) {
      switch (this.id.type) {
        case 'number': {
          query[this.id.field] = parseInt(requestDetails.url);
          break;
        }
        case 'float': {
          query[this.id.field] = parseFloat(requestDetails.url);
          break;
        }
        case 'ObjectID': {
          try {
            query[this.id.field] = new ObjectID(requestDetails.url);
          } catch (e) {
            return callback(e, null);
          }
          break;
        }
        default: {
          query[this.id.field] = requestDetails.url;
        }
      }
    } else {
      if (requestDetails.url.length != 24) {
        this.debug.debug('Validate:TokenSystem Token length != 24');
        return new Error('Wrong request');
      }
  
      try {
        query._id = new ObjectId(requestDetails.url);
      } catch (e) {
        return e;
      }
    }
    query.token = requestDetails.headers.token;
    try {
      let record = await collection.findOne(query);
      if(!record){
        return new Error('Not found');
      }
      return true;
    } catch (err) {
      this.debug.debug('MongoClient:findOne err: %O', err);
      return err;
      
    }
  };
  let AccessToken = async (method) => {
    this.debug.debug('Validate:AccessToken');
    let accessToken = '';
    let msClientSettings = {
      URL: process.env.ROUTER_PROXY_URL + '/auth',
      headers: {
        scope: process.env.SCOPE,
      },
    };
    // Compatibility with old versions
    if (requestDetails.headers.access_token) {
      accessToken = requestDetails.headers.access_token;
    }
    if (requestDetails.headers['access-token']) {
      accessToken = requestDetails.headers['access-token'];
    }
    msClientSettings.accessToken = accessToken;
  
    let authServer = new MicroserviceClient(msClientSettings);
    let response = await authServer.get(accessToken)
    if (response.error) {
      this.debug.debug('authServer:search err: %O', err);
      return new Error('Access denied. Token not found or expired.');
    }
    this.debug.debug('authServer:search %O ', response.answer);
    if (!response.answer.methods) {
      this.debug.debug('authServer:search no methods provided');
      return new Error('Access denied');
    }
  
    if (!response.answer.methods[method.toLowerCase()]) {
      this.debug.debug('Request:%s denied', method);
      return new Error('Access denied');
    }
  
    this.requestDetails.auth_methods = response.answer.methods;
  
    if (response.answer.credentials) {
      requestDetails.credentials = response.answer.credentials;
    } else {
      requestDetails.credentials = {};
    }
  
    return true;
  };
  let SignatureSystem = () => {
    this.debug.debug('Validate:SignatureSystem');
    var sign = requestDetails.headers.signature.split('=');
  
    if (sign.length != 2) {
      this.debug.debug('Validate:SignatureSystem Malformed signature');
      return new Error('Malformed signature');
    }
  
    if (sign[1] != signature(sign[0], data, this.secureKey)) {
      this.debug.debug('Validate:SignatureSystem Signature mismatch');
      return callback(new Error('Signature mismatch'));
    }
    return true;
  };
  
  
  this.debug.debug('Validate:requestDetails %O ', requestDetails);

  let isAccessToken = false;
  if (requestDetails.headers.access_token) {
    isAccessToken = true;
  }
  if (requestDetails.headers['access-token']) {
    isAccessToken = true;
  }

  if (isAccessToken) {
    return AccessToken(method);
  }

  switch (method) {
    case 'PUT': {
      if (!requestDetails.headers.signature && !requestDetails.headers.token) {
        this.debug.debug('Validate:PUT Signature or Token required');
        return new Error('Signature or Token required');
      }
      if (requestDetails.headers.signature) {
        return SignatureSystem();
      }
      if (requestDetails.headers.token) {
        return TokenSystem();
      }
      break;
    }
    case 'POST':
    case 'OPTIONS':
    case 'SEARCH': {
      if (!requestDetails.headers.signature) {
        this.debug.debug('Validate:%s Signature required', method);
        return new Error('Signature required');
      }
      return SignatureSystem();
    }
    default: {
      if (!requestDetails.headers.token) {
        this.debug.debug('Validate:%s Token required', method);
        return new Error('Token required');
      }
      return TokenSystem();
    }
  }
}
