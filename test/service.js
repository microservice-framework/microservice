import Microservice from '../index.js';
import Cluster from '@microservice-framework/microservice-cluster';

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

// Create a new microservice
let ms = new Microservice({
  mongoUrl: process.env.MONGO_URL,
  mongoDB: process.env.MONGO_DB,
  schema: process.env.SCHEMA,
  mongoTable: process.env.MONGO_TABLE,
  secureKey: process.env.SECURE_KEY,
});

const cluster = new Cluster({
  loader: function (request, callback) {
    console.log('loader', request.url);
    request.test = true;
    callback(null);
  },
  singleton: function (isStart, variables) {
    console.log('singleton', isStart, variables);
    if (isStart) {
      variables({ test: 1 });
    } else {
      process.exit(0);
    }
  },
  init: function (callback) {
    callback({ test: 1 });
    console.log('init');
  },
  shutdown: function (init) {
    console.log('shutdown', init);
    process.exit(0);
  },
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

cluster.on('online', function (worker) {
  console.log('Worker %s is online', worker.process.pid);
});

cluster.on('exit', function (worker, code, signal) {
  console.log('Worker %s died. code %s signal %s', worker.process.pid, code, signal);
});
