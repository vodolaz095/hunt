/*
 * "Hello, world!" example
 */

var hunt = require('./../index.js'),
  Hunt = hunt();

Hunt.extendRoutes(function(core){
  core.app.get('/', function(req,res){
    res.send('Hello, world!');
  });
});

Hunt.startWebServer();