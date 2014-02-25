/**
 * Rest api example
 */

var hunt = require('./../index.js'),
  async = require('async'),
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
  core.app.locals.css.push({'href': '/css/style.css', 'media': 'screen'});
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
//populating the trophies' collection in database
  async.parallel([
    function (cb) {
      Hunt.model.Trophy.findOneAndUpdate({'name': 'Alan Schaefer'}, {scored: false}, {upsert: true}, cb);
    },
    function (cb) {
      Hunt.model.Trophy.findOneAndUpdate({'name': 'George Dillon'}, {scored: true}, {upsert: true}, cb);
    },
    function (cb) {
      Hunt.model.Trophy.findOneAndUpdate({'name': 'Rick Hawkins'}, {scored: true}, {upsert: true}, cb);
    },
    function (cb) {
      Hunt.model.Trophy.findOneAndUpdate({'name': 'Blain Cooper'}, {scored: true}, {upsert: true}, cb);
    },
    function (cb) {
      Hunt.model.Trophy.findOneAndUpdate({'name': 'Billy Sole'}, {scored: true}, {upsert: true}, cb);
    },
    function (cb) {
      Hunt.model.Trophy.findOneAndUpdate({'name': 'Mac Eliot'}, {scored: true}, {upsert: true}, cb);
    },
    function (cb) {
      Hunt.model.Trophy.findOneAndUpdate({'name': 'Anna Goncalves'}, {scored: false}, {upsert: true}, cb);
    }
  ], function (err, trophies) {
    if (err) {
      console.error(err);
    } else {
      console.log('' + trophies.length + ' trophies recorded.');
    }
  });

  setInterval(function () {
    var now = new Date().toLocaleTimeString();
    Hunt.emit('broadcast', now); //to be broadcasted by socket.io
  }, 500);
});

/**
 * Starting webserver
 */
Hunt.startWebServer();
