/**
 * Cluster example
 */

var hunt = require('./../index.js'),
  Hunt = hunt({
    'enableMongoose' : false, //we do not need mongoose database for this example
    'enableMongooseUsers' : false, //we do not need mongoose users for this example
//setting up socket io with verbose loglever
    'io': {'loglevel': 2},
    'public': __dirname + '/public', //directory for assets - css, images, client side javascripts
    'views': __dirname + '/views', //directory for templates,
    'maxWorkers':3 //how many workers for clustering is spawned, default is 1 worker process per CPU core
  });


/**
 * Settig up static assets - css and javascripts
 */
Hunt.extendApp(require('./lib/assetsLoader.js'));

/**
 * Setting expressJS application routes
 */
Hunt.extendRoutes(function(core){

//route to show page with explanation what this example do
  core.app.get('/',function(req,res){
    res.render('cluster',{'title':'Hunt - Clustering'});
  });

//route to cruely kill this helpless nodejs process,
//and make cluster spawn another one to make you
//happy killing it too)
  core.app.get('/boom',function(req,res){
    setTimeout(function(){
      core.stop();
      process.exit(0);
    },100);
    res.redirect('/');
  });

//route to throw some stupid error,
//that will be catched by error reporter middleware and will not stop the process

  core.app.get('/error', function(req,res){
    throw new Error('Something is wrong... Please, wipe your spectacles with alcohol or spirit and carefully kick PC with hammer 3 times.');
  });
  core.app.get('/baderror', function(req,res){
    (function(){
      throw new Error('Catch this!');
    })();
  });

});

/**
 * Actions to perform, when hunt is started
 */
Hunt.once('start', function () {
  setInterval(function () {
    var now = new Date().toLocaleTimeString();
    Hunt.emit('broadcast', {'time':now}); //to be broadcasted by socket.io
  }, 500);
});

//event that is emmited on any error throwed in any of controllers
//also we notify admin by email - (see http://huntjs.herokuapp.com/documentation/config.html - adminEmail)
//that there is some sort of error
//by default it is done by direct mail transport, so it will work alwayes,
//but the message will likely be marked as spam
Hunt.on('httpError', function(err){
  console.error(err);
});

/*
 * Starting cluster of webserveres
 * We start 2 worker processes and 1 master process
 * We listen to port 3000
 */
//Hunt.startWebCluster(3,3000);
/*
 *But let us Hunt to decide
 *how many worker process is spawned (1 for every CPU core present)
 *and what port to use (from config or process.env.port or default - 3000)
 */
Hunt.startWebCluster();
