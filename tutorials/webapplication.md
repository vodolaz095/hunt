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

###Setting up custom router

###Starting as single threaded application




###Starting as clustered application
