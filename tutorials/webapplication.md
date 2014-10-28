Building a web application
===================
The main purpose of HuntJS is to make web applications.
In this tutorial we will follow step by step this process.



###Instantiating HuntJS application
We need to pass the [config object](/documentation/config.html) to factory method
to build HuntJS application instance.


```javascript

    var
      Hunt = require('hunt'), //factory
      config = { //setting up configuration parameters

      };

    var hunt = Hunt(config); //building instance

```

###Setting up mongoose models
The [mongoose](http://mongoosejs.com/) powered models works from the box.
Also we have powerful [User's model](/documentation/User.html) at your disposal.

Basic way to set model via [hunt.extendModel](/documentation/Hunt.html#extendModel):

```javascript

    hunt.extendModel('Trophy', function (core) {
      var TrophySchema = new core.mongoose.Schema({
        'name': {type: String, unique: true},
        'scored': Boolean,
        'priority': Number,
        'owner': { type: core.mongoose.Schema.Types.ObjectId, ref: 'User' }
      });

      TrophySchema.index({
        name: 1
      });

      //this step is very important - bind mongoose model to current mongo database connection
      //and assign it to collection
        return core.mongoConnection.model('Trophy', TrophySchema);
      });

```

This model will be accessible as field of [Model object](/documentation/model.html),
as `hunt.Model.Trophy` in application and as `request.model.Trophy` in controllers.


Also we can make models exportable to
[REST](http://www.restapitutorial.com/) interface -
see [ExportModelToRestParameters](http://huntjs.herokuapp.com/documentation/ExportModelToRestParameters.html)
for details.


###Setting up sequilize models
We need to install separate plugin of [hunt-sequilize](https://www.npmjs.org/package/hunt-sequilize)
to use models provided by [sequilize ORM](https://www.npmjs.org/package/sequelize)

```javascript

    huntSequilize(Hunt);

    Hunt.extendModel('Planet', function (core) {
      return core.sequelize.define('Planet', {
        name: core.Sequelize.STRING
      });
    });

```


###Setting up custom view engine to render templates
We can set [parameters](http://expressjs.com/4x/api.html#app-settings) of
[ExpressJS](http://expressjs.com/) application used in HuntJS to set view engine
by using [hunt.extendApp](/documentation/Hunt.html#extendApp).

```javascript

    hunt.extendApp = function (core) {
      core.app.set('views', __dirname + '/views');
      core.app.set('view engine', 'ejs');
      core.app.set('layout', 'layout');
      core.app.enable('view cache');
      core.app.engine('ejs', require('ejs'));
    };

```


###Setting up custom middlewares
HuntJS borrows the [middleware stack](http://expressjs.com/4x/api.html#middleware) from ExpressJS 4.x
We can add middlewares to our application in this way:

```javascript

    //set middleware for `/` mount point
    hunt.extendMiddleware(function(core){
      return function(req, res, next){
        res.setHeader('X-hunt','YES!');
        next();
      };
    };

    //set middleware only for `production` environment and `/` mount point
    hunt.extendMiddleware('production',function(core){
      return function(req, res, next){
        res.setHeader('X-production','YES!');
        next();
      };
    };

    //set middleware only for `production` and `staging` environments for `/somepath` mount point
    hunt.extendMiddleware(['production','staging'],'/somepath',function(core){
      return function(req, res, next){
         if(!request.user){
           response.send(403);
         } else {
           next();
         }
      };
    };

     //setting middleware for specified path and development environment only
     Hunt.extendMiddleware('development', '/somePath', function (core) {
       return function (req, res, next) {
         res.setHeader('devMiddleware1', core.someVar);
         next();
       };
     });

     //setting middleware, that asks user to verify his/her email address
     Hunt.extendMiddleware(function (core) {
       return function(req,res,next){
         if(req.user){
           if (req.user.accountVerified) {
             next();
           } else {
             req.flash('error','Verify your email address please!');
             next();
           }
         } else {
           next();
         }
       };
     });

```


###Setting up custom routes

We can set custom routes using [extendRoutes](/documentation/Hunt.html#extendRoutes)
using [ExpressJS verbs](http://expressjs.com/api.html#app.VERB).

```javascript

    hunt.extendRoutes(function(core){

      core.app.get('/', function(req,res){
        res.send('Hello!');
      });

      core.app.all('*',function(req,res){
        res.send(404);
      });
    }

```


###Setting up custom router
Add custom [router](http://expressjs.com/api.html#router) for expressjs application

```javascript

    hunt.extendController('/', function(core, router){
       router.use(function(request,response,next){
         response.setHeader('devMiddleware1', core.someVar);
         next();
       });
       router.get('/', function(request,response){
         response.render('index',{'title':'Hello!'});
       });
      router.post('/', function(request,response){
        response.render('index',{'title':'Hello!'});
      });
    });

    hunt.extendController('/some_path', function(core, router){
       router.use(function(request,response,next){
         response.setHeader('devMiddleware1', core.someVar);
         next();
       });
       router.get('/', function(request,response){
         response.render('index',{'title':'Hello!'});
       });
      router.post('/', function(request,response){
        response.render('index',{'title':'Hello!'});
      });
    });

    //this controller overwrites the first one!
    hunt.extendController('/', function(core, router){
     router.get('/', function(request,response){
       response.render('index2',{'title':'Hello!'});
     });
    });

```


###Starting as single threaded application
In can be done by [hunt.StartWebServer](/documentation/Hunt.html#startWebServer) easily

```javascript

    hunt.on('start', function(payload){
      console.log('Started HuntJS as '+payload.type+' on '+payload.address+':'+payload.port);
    //will output ->
    //Started HuntJS as webserver on 0.0.0.0:80
    });
    hunt.startWebServer(); //listen on port from config
    hunt.startWebServer(80); //listen on hardcoded port of 80
    hunt.startWebServer(80,'0.0.0.0'); //listen on hardcoded port of 80, listening to all interfaces
    hunt.startWebServer(80, 'fe80::7218:8bff:fe86:542b'); //listen on specified IPv6 address

```

###Starting as clustered application
We can scale HuntJS applications easily to manifold
of processes by means of [native nodejs cluster](http://nodejs.org/api/cluster.html)

```javascript

    //we start 5 processes on port 80
    if (hunt.startWebCluster(80, 5)) { // Hunt#startCluster returns true for MASTER process
    //this code is executed in MASTER process only
      hunt.once('start', function () {
      //do things here
      });
    } else {
      console.log('We have started child process #' + process.pid);
    }

    //we start 2 web processes on port fron config
    if (hunt.startCluster({ 'web': 2 })) { // Hunt#startCluster returns true for MASTER process
    //this code is executed in MASTER process only
      hunt.once('start', function () {
      //do things here
      });
    } else {
      console.log('We have started child process #' + process.pid);
    }

```