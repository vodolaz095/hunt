/**
 * Socket.io powered clock example
 */

var hunt = require('./../index.js'),
  Hunt = hunt({
    'enableMongoose' : false, //we do not need mongoose database for this example
    'enableMongooseUsers' : false, //we do not need mongoose users for this example
//setting up socket io with verbose loglever
    'io': {'loglevel': 2},
    'public': __dirname + '/public', //directory for assets - css, images, client side javascripts
    'views': __dirname + '/views' //directory for templates
  });

/**
 * Settig up static assets - css and javascripts
 */
Hunt.extendApp(function(core){
  core.app.locals.css.push({'href': '/css/style.css', 'media': 'screen'});
  core.app.locals.javascripts.push({'url': '/javascripts/hunt.js'});
});

/**
 * Setting up catch all route
 */
Hunt.extendRoutes(function(core){
  core.app.get('*', function(req,res){
    res.render('clock', {
      'title':'Hunt socket.io example',
      'description':'The clock in menu actually works!'
    });
  });
});

Hunt.once('dts', console.info); //catching `dts` event`
Hunt.once('start', function () {
  setInterval(function () {
    var now = new Date().toLocaleTimeString();
    Hunt.emit('dts', 'Time now is ' + now); //to be catched by console
    Hunt.emit('broadcast', {'time':now}); //to be broadcasted by socket.io
  }, 500);
});

/**
 * Starting webserver
 */
Hunt.startWebServer();
