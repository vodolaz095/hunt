/**
 * Rest api example
 */

var hunt = require('./../index.js'),
  Hunt = hunt({
    //'mongoUrl' : 'mongodb://localhost/hunt_dev', //this is default value
    'enableMongoose' : true, //we need mongoose database for this example
    'enableMongooseUsers' : false, //we do not need mongoose users for this example
//setting up socket io with verbose loglever
    'io': {'loglevel': 2},
    'public': __dirname + '/public', //directory for assets - css, images, client side javascripts
    'views': __dirname + '/views' //directory for templates
  });


/*
 * Creating mongoose model of Trophies
 */
if (Hunt.config.enableMongoose) {
  Hunt.extendModel('Trophy', require('./models/trophy.model.js'));
// So, this model is accessible by
// Hunt.model.Trophy
} else {
  throw new Error('This example needs mongo database started and config.enableMongoose set to true!');
}


/*
 * Settig up static assets - css and javascripts
 */
Hunt.extendApp(function(core){
  core.app.locals.menu=[
    {'url':'/trophies','name':'Trophies'},
    {'url':'/trophies/new','name':'Create new trophy'}
  ];
  core.app.locals.css.push({'href': '//yandex.st/bootstrap/3.1.1/css/bootstrap.min.css', 'media': 'screen'});
  core.app.locals.javascripts.push({'url': '//yandex.st/jquery/2.0.3/jquery.min.js'});
  core.app.locals.javascripts.push({'url':'//yandex.st/bootstrap/3.1.1/js/bootstrap.min.js'});
  core.app.locals.javascripts.push({'url': '/javascripts/hunt.js'});
});

/*
 * Setting up api endpoind to trophies
 * https://github.com/visionmedia/express-resource
 */
Hunt.extendRoutes(function(core){
  core.app.resource('trophies',require('./api/trophy.api.js'));
});

/*
 * Route for index page to make redirects
 */
Hunt.extendRoutes(function(core){
  core.app.get('/', function(req, res){
    res.redirect('/trophies');
  });
});


Hunt.once('start', function () {
  require('./lib/populateDatabase')(Hunt);

  setInterval(function () {
    var now = new Date().toLocaleTimeString();
    Hunt.emit('broadcast', now); //to be broadcasted by socket.io
  }, 500);
});

/**
 * Starting webserver
 */
Hunt.startWebServer();
