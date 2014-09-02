var hunt = require('hunt')({
  'port': 3000
})
  .extendRoutes(function (core) {
    core.app.get('/', function (req, res) {
      res.send('Hello, world!');
    });
  })
  .startWebServer();
