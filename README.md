# microservice

[![npm](https://img.shields.io/npm/dt/@microservice-framework/microservice.svg?style=flat-square)](https://www.npmjs.com/~microservice-framework)
[![microservice-frame.work](https://img.shields.io/badge/online%20docs-200-green.svg?style=flat-square)](http://microservice-frame.work)

Microservice framework worker class.

Simple example:

```js
'use strict';

const Cluster = require('@microservice-framework/microservice-cluster');
const Microservice = require('@microservice-framework/microservice');

import dotenv from 'dotenv';
dotenv.config();


var mservice = new Microservice({
  mongoUrl: process.env.MONGO_URL,
  mongoDB: process.env.MONGO_DB,
  schema: process.env.SCHEMA,
  mongoTable: process.env.MONGO_TABLE,
  secureKey: process.env.SECURE_KEY,
});

const cluster = new Cluster({
  validate: ms.validate.bind(ms),
  methods: {
    POST: ms.post.bind(ms),
    GET: ms.get.bind(ms),
    PUT: ms.put.bind(ms),
    DELETE: ms.delete.bind(ms),
    SEARCH: ms.aggregate.bind(ms),
    OPTIONS: ms.options.bind(ms),
    PATCH: ms.aggregate.bind(ms),
  },
});

```

For more details please check our [website](http://microservice-frame.work)

### Changelog

- `1.3.0` - open mongo connection on class init, instead of each request.
- `1.3.1` - bug fix.
- `1.3.2` - implements events error and ready.
- `1.3.3-5` - Implementing new access token validation mechanism
- `1.3.6` - fix Access-token check. 
- `1.3.7` - Add ObjectID like field defenition.
- `1.3.8` - Fix removing _id from output when _id specified as field.

- `2.0.0` - Fix search by id when it is array.
          - support header execution-limit to limit execution time
          - support header force-index to force index search
          - support for env MAX_TIME_MS to set max exection time for search
          - support noCount request params to avoid countin total-count on search
          - properly close mongo connection on SIGINT (mfw stop serviceName)

- `3.0.0` - switching from callback to async and usage new cluster.
          - moved validate and loader out of the callbacs
          - renamed callbacks to method
          - added singleton as a separated worker to run function
          - added init, shutdown to run on init and shutdown in each worker
- `3.0.1` - bugfix signature
- `3.0.2` - bugfix with :id param
- `3.0.3` - bugfix with token generation
- `3.0.4` - bugfix with options method
- `3.0.5` - bugfix with options schema and description pre read
