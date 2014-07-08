var hunt = require('./../index.js'),
  Hunt = hunt();

Hunt.extendRoutes(function (core) {
  core.app.use('/1sec', Hunt.cachingMiddleware(1000));
  core.app.use('/2sec', Hunt.cachingMiddleware(2000));
  core.app.all('*', function (req, res) {
    res.send('' + Date.now());
  });
});

Hunt.startWebServer();