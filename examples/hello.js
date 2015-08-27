'use strict';

require('./../index.js')({'port': 3000})//it have to be `require('hunt')`
  .extendController('/', function (core, router) {
    router.get('/', function (req, res) {
      res.send('Hello, world!');
    });
  })
  .startWebServer();
