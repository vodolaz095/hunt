/**
 * Example, that shows users currently online, with redis.io notification of new users
 */

var hunt = require('./../index.js'),
  pinger = require('./lib/pinger'),
  Hunt = hunt({
    'enableMongoose': false, //we do not need mongoose database for this example
    'enableMongooseUsers': false, //we do not need mongoose users for this example
//setting up socket io with verbose loglever
    'io': {'loglevel': 2},
    'public': __dirname + '/public', //directory for assets - css, images, client side javascripts
    'views': __dirname + '/views' //directory for templates
  });

/*
 * Settig up static assets - css and javascripts
 */
Hunt.extendApp(require('./lib/assetsLoader.js'));


/*
 * Setting middleware to count users online
 * http://expressjs.com/guide.html#users-online
 */

//storing new users in redis database
Hunt.extendMiddleware(function (core) {
  return function (req, res, next) {
    var ua = req.headers['user-agent'];
    req.redisClient.zadd('online', Date.now(), ua, next);
  };
});

//injecting users into response locals
Hunt.extendMiddleware(function (core) {
  return function (req, res, next) {
    var min = 60 * 1000;
    var ago = Date.now() - min;
    req.redisClient.zrevrangebyscore('online', '+inf', ago, function (err, users) {
      if (err) return next(err);
      res.locals.online = users;
      next();
    });
  };
});


/**
 * Setting up catch all route
 */
Hunt.extendRoutes(function (core) {
  core.app.get('*', function (req, res) {
    res.render('online', {
      'title': 'Hunt socket.io and users online example',
      'description': 'This is a list of currently online clients'
    });
  });
});

Hunt.on('httpSuccess', function (httpEvent) {
  Hunt.emit('broadcast', {'httpSuccess':httpEvent});
});

/**
 * Starting webserver
 */
Hunt.startWebServer();

