/**
 * Central Startup file.
 * Launch cluster and workers.
 * React on SIGINT and SIGTERM.
 * restart worker if worker exit.
 */
"use strict";

const gcloud = require('gcloud');
require('dotenv').config();

var namespace = process.env.NAMESPACE;

var datastore = gcloud.datastore({
  projectId: 'analog-subset-130814',
  keyFilename: './settings/keyfile.json'
});

var TaskLogKey = datastore.key({
  namespace: namespace,
  path: ['TaskLog']
});
  var task  =  [
      {
        name: 'type',
        value: 'Personal'
      },
      {
        name: 'created',
        value: new Date()
      },
      {
        name: 'done',
        value: false
      },
      {
        name: 'priority',
        value: 4
      },
      {
        name: 'percent_complete',
        value: 10.0
      },
      {
        name: 'description',
        value: 'Learn Cloud Datastore',
        excludeFromIndexes: true
      }
    ];

datastore.insert({
    key: TaskLogKey,
    data: task
  }, function (err) {
    if (!err) {
      console.log(err || entity);
    }
  });
  
datastore.get(TaskLogKey, function(err, entity) {
  console.log(err || entity);
});