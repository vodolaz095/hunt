var hunt = require('hunt')({
  'port': 3000
})
  .extendController('/', function (core, router) {
    router.get('/', function (req, res) {
      res.send('Hello, world!');
    });
  })
  .startWebServer();
