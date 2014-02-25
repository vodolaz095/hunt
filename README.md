Hunt
====================
[![Build Status](https://travis-ci.org/vodolaz095/hunt.png)](https://travis-ci.org/vodolaz095/hunt)
[![Dependency Status](https://gemnasium.com/vodolaz095/hunt.png)](https://gemnasium.com/vodolaz095/hunt)

**What do you get from the box?**

Just run `npm install hunt` and you get ready to use higher level nodejs framework,
that links together many preconfigured and working perfectly together modules.
This is it. *Hunt*...

-  works on latest versions of [NodeJS](http://nodejs.org) >=0.10.22

-  is a real event driven (by pattern [Observer](https://en.wikipedia.org/wiki/Observer_pattern))
   framework build on top of [ExpressJS](http://expressjs.com),
   suitable not only for creating HTTP-based web applications, but background services,
   binary protocol applications, websockets or even xmpp based applications.

-  [Mongo database](http://www.mongodb.org/) and
    [Mongoose ORM](http://mongoosejs.com/) support from the box

-  [sequelizejs](http://sequelizejs.com/) ORM for [MySQL](https://www.mysql.com/),
   [PostgreSQL](http://www.postgresql.org/), [sqlite](https://www.sqlite.org/)
   and [MariaDB](https://mariadb.org/) from the box.

-  The best sides of express.js framework are supported: routing, [middlewares](http://expressjs.com/api.html#middleware)

-  Popular templating engines are supported - [Mustache](http://mustache.github.io/mustache.5.html),
   [Swig](http://paularmstrong.github.io/swig/), jade (to be implemented shortly)

-  Powerful users model to use at your application, with customizable profile, groups,
    and compatibility with majority of [passport.js](http://passportjs.org")
    strategies, custom profile data and build up with
    [Active Record](https://en.wikipedia.org/wiki/Active_record_pattern)
    and [Observer](https://en.wikipedia.org/wiki/Observer_pattern) patterns

-  [Redis](http://redis.io) database support from the box, with default use of it as session storage.

-  Hunt applications are easy to run on [Heroku](http://heroku.com/) hosting - many config values
    (mongo/redis database access URLs, etc...) are populated automatically

-  [Clustering](http://nodejs.org/docs/latest/api/cluster.html)
    by the means of nodejs build in load balancer

-  Websocket, Htmlfile, xhr-polling, jsonp-polling for real time push messages
    are supported by the means of [socket.io](http://socket.io) and works
    from the box, even with websockets working on [nginx](http://nginx.org/en/docs/http/websocket.html)

-  [socket.io](http://socket.io) is perfectly linked with user
    model and passportjs authorization system, so you can send realtime
    notifications to users online just like this

```javascript

    Hunt.model.User.findOne({'email':'somebody@example.org'},
      function(err, userFound){
        //notify on user
        userFound.notifyBySocketIo({
          'priority':'high',
          'message':'You are being hunted!'
        });
        //notify all online users by means of socket.io broadcast
        Hunt.emit('broadcast', {
          'priority':'high',
          'message':'Everybody hunts Somebody at example dot org!'
        })
      });

```

Important
=======

Without understanding how [express.js framework](http://expressjs.com/) operates, including

 - concept of [app](http://expressjs.com/api.html#express),
 - concept of [middleware](http://expressjs.com/api.html#middleware) and how [it can be used](http://webapplog.com/intro-to-express-js-parameters-error-handling-and-other-middleware/)
 - concept of chaining the middlewares (this is example of adding middleware to a chain [to count users online](http://expressjs.com/guide.html#users-online))
 - concept [route](http://expressjs.com/api.html#app.VERB)

this module is hard to understand. Please, read this information above before processing with this framework.


Concept of expandable expressJS application
================
Why do we need this plugin? Let us consider this expressJS application

```javascript

    var express = require('express')
      passport = require('passport');

  /*
   *initializing mongoose models (1)
   */

    var model = require('./model/models.js').init();

  /*
   *initializing passport.js strategies (2)
   */

    passport.use(/*some stuff*/);
    passport.use(/*some stuff*/);
    passport.use(/*some stuff*/);
    passport.serializeUser(function(user, done) {/*some stuff*/});
    passport.deserializeUser(function(obj, done) {/*some stuff*/});

  /*
   *seting application parameters (3)
   */

    var app = express();
    app.set('views', templateDirectory);
    app.set('view engine', 'html');
    app.set('layout', 'layout');
    app.engine('html', require('hogan-express'));

  /*
   *setting middlewares
   */

    app.use(express.logger());
    app.use(express.cookieParser());
    app.use(express.bodyParser());
    app.use(express.methodOverride());

  /*
   *setting session middleware to use with passportJS (2)
   */

    app.use(express.session({ secret: 'keyboard cat' }));
    app.use(passport.initialize());
    app.use(passport.session());

  /*
   *custom middleware (4)
   */

    app.use(function(request,response,next){
      if(request.user){
        response.locals.myself = request.user;
      }
    });


  /*
   *inject mongoose models middleware (1)
   */

    app.use(function(request, response, next){
      request.model = model;
      next();
    });

  /*
   *router middleware
   */

    app.use(app.router);

  /*
   *setting error catcher middleware
   */

    app.use(function (err, req, res, next) {
     res.status(503);
     res.header('Retry-After', 360);
     res.send('Error 503. There are problems on our server. We will fix them soon!');
    });

  /*
   *setting routes (5)
   */

    app.get('/', function(req, res){
      res.send('hello world');
    });

  /*
   *starting application
   */

    app.listen(3000);

```

This application can be anything - blog platform, todo list, chat...
And if you closely examine all expressJS applications, you will find, that they usually have 5 hotspots, that
change from one to other application. This spots give the individuality to application, make it different from others.
This spots are

 1. Place to initialize mongoose models, and inject it to application routes controllers
 2. Place, where we tune the [passport.js](http://passportjs.org/) middleware - set up strategies and code to extract user profile from mongo database and add it to middleware chain
 3. Place to set application parameters - template engine, locals,
 4. Setting up custom middlewares in application chain
 5. Setting up application routes

 So, all expressJS application do differ on 5 points. And this is all, other code is shared between applications.
 In other works, we can create different applications by just tuning expressJS applications in this 5 points.
 So, maybe we need to automatize this procedure, create a class, that will vendor expressJS application by applying
 some settings functions on it in proper parts.

 This node module do this - it allows us to make transformations to expressJS application automatically.


Example
====================
This is short, basic, "hello, world!" example, to start http server on 3000 port.

```javascript

    var hunt = require('./../index.js'),
      Hunt = hunt({
        'port':3000
      });

    Hunt.extendRoutes(function(core){
      core.app.get('/', function(req,res){
        res.send('Hello, world!');
      });
    });

    Hunt.startWebServer();

```

Other examples are published here [https://github.com/vodolaz095/hunt/tree/master/examples](https://github.com/vodolaz095/hunt/tree/master/examples)

Generate documentation
====================

To to this, you need to run a shell script

```shell

    $ ./generateDocs.sh

```

And the JSDOC documentation will be created in `examples/public/documentation`
directory as HTML files.


All configurations options
====================
We can create hunt application by passing config object to factory function. If the value is not defined in config, it has
usually sane default value.

```javascript

    var hunt = require('hunt');

    var config = {
      //'secret' : 'someLongAndHardStringToMakeHackersSadAndEldersHappy', //default - random string
      //'port' : 3000, //port for http server to bind to, default is 3000
      //'env' : 'development', //nodejs enviroment, default is `development`
      //'hostUrl': 'http://example.org/', //default is `localhost` for dev enviroment and require('os').hostname() for other enviroments

      //'redisUrl' : 'redis://localhost:6379', //redis database is used as session storage

      //'enableMongoose' : true, //if mongoose enabled, mongoUrl is accounted
      //'mongoUrl' : 'mongo://localhost/hunt_dev', //default value
      //'enableMongooseUsers' : true,

      //'uploadFiles': false, // allow upload of files by HTTP-POST

      //'sessionExpireAfterSeconds':180, //session TTL, default is 180

      //'sequelizeUrl':false, //it is disabled by default
      //there can be this posibilities
      //you need to install sqlite3@~2.1.5, this package is not bundled in hunt
      //'sequelizeUrl':'sqlite:///username:password@database.db/somedb', //database.db is filename to store database, default is :memory:
      //you need to install mysql@~2.0.0-alpha7, this package is not bundled in hunt
      //'sequelizeUrl':'mysql://username:password@localhost:3306/somedb',
      //you need to install  pg@~2.0.0, this package is not bundled in hunt
      //'sequelizeUrl':'postgres://username:password@localhost:5432/somedb',

      //'templateEngine' :'hogan', //can be `hogan`, `jade`
      //'maxWorkers': require('os').cpus().length, //max http workers for clustering enviroment

      //socket.io configuration
      'io': {
        'loglevel': 2
      },

      //for password strategies
      'passport': {
        'local': true, //authorization by username/email and password, POST to /auth/login
        'google': true, //authorization by gmail account, GET /auth/google

        // Github oAuth strategy
        // GET /auth/github
        'GITHUB_CLIENT_ID': '1fca293397b695386e24',
        'GITHUB_CLIENT_SECRET': 'fc3328b4fbf62683f3c2adaf1370889f4b64c9f4',

        // twitter oAuth strategy
        // GET /auth/twitter
        'TWITTER_CONSUMER_KEY': 'CrFlQq2QbOPvE4u6Ltg',
        'TWITTER_CONSUMER_SECRET': 'fxzWLEgkxXGPLVFQdcpgOGEjdiGRAR9nWx8Kt5cnM'
      },

      'public': __dirname + '/public', //directory for assets - css, images, client side javascripts
      'views': __dirname + '/views' //directory for templates for view engine

    };

    var Hunt = hunt(config); //we created application!

```

Hunt.extendCore(fieldName, valueOrConstructor);
====================
This function allows us to dependency inject functions, objects and values into core of Hunt.
If we try to rewrite properly already defined, the error is thrown.

Example:
```javascript

    //extending application core
    Hunt.extendCore('someVar', 42); //assign value to field
    //assign factory function to field, the field value is result of this function
    Hunt.extendCore('someFuncToGetSomeVar', function (core) {
      return core.someVar;
    });
    //assign function to a core
    Hunt.extendCore('getSumWithSomeVar', function (core) {
      return function (a, b) {
        return a + b + core.someFuncToGetSomeVar;
      };
    });
    //Hunt core works after extending
    console.log('Sum of 2, 2 and 42 is ' + Hunt.getSumWithSomeVar(2, 2));

```

Hunt.extendApp(function(core){...});
====================
We can set the parameters of expressJS application by this function, including
[set](http://expressjs.com/api.html#app.set), [template engine](http://expressjs.com/api.html#app.engine),
[locals](http://expressjs.com/api.html#app.locals) and so on, before the middleware initialization

Example:
```javascript

    Hunt.extendApp(function (core) {
      core.app.set('someVar', core.someVar); //set variable for application, see http://expressjs.com/api.html#app.set
      //this is a way to handle assest (css, javascript)
      core.app.locals.css.push({'href':'/css/style.css', 'media':'screen'});
      core.app.locals.javascripts.push({'url': '//yandex.st/jquery/2.0.3/jquery.min.js'});
      core.app.locals.javascripts.push({'url': '//cdnjs.cloudflare.com/ajax/libs/knockout/2.3.0/knockout-min.js'});
      core.app.locals.javascripts.push({'url': '/javascripts/chats.js'});
    });

```

Hunt.extendModel(ModelName, ModelConstructor) for mongoose model
====================
We can easily create mongoose models like this, presuming that we have enabled mongoose.
The mongoose object is exposed as `core.mongoose` in constructor function
Example:
```javascript

    if (Hunt.config.enableMongoose) {
      Hunt.extendModel('Trophy', function (core) {
        var TrophySchema = new core.mongoose.Schema({
          'name': {type: String, unique: true},
          'scored': Boolean
        });
        TrophySchema.index({
          name: 1
        });
    //this step is very important - bind mongoose model to current mongo database connection
    // and assign it to collection in mongo database
        return core.mongoConnection.model('Trophy', TrophySchema);
      });

    // So, this model is accessible by
    // Hunt.model.Trophy
    }

```

Hunt.extendModel(ModelName, ModelConstructor) for sequilize model
====================
If we have configured sequilize databases, we can create models for it like this.
The core `core.sequelize` is exposed sequilize orm object with connection established

```javascript

    if (Hunt.config.sequelizeUrl) {
      Hunt.extendModel('Planet', function (core) {
        var Planet = core.sequelize.define('Planet', {
          name: core.sequelize.STRING
        });
        return Planet;
      });

    // So, this model is accessible by
    // Hunt.model.Planet
    }

```

Hunt.extendMiddleware(enviromentNameOrArray,path,constructorFunction)
====================
We can set our custom middlewares for expressJS application.
Also `request` part in every controller is extended by this fields

-  `model` - all mongoose/sequilize models created
-  `redisClient` - redis client
-  `huntEmit` - function(eventName, eventPayload){...} - you can send events by Hunt embedded event emitter
-  `user` - passport.js representation of current user authenticated

`Response` part in every controller have this values

-  `locals` - see [http://expressjs.com/api.html#app.locals](http://expressjs.com/api.html#app.locals)
    this variables are passed to template when rendering, it includes
-  `locals.css` - array of css styles
-  `locals.javascript` - array of client side javascripts
-  `locals.csrf` - [cross site request forgery](https://en.wikipedia.org/wiki/Cross-site_request_forgery) protecting key
-  `locals.myself` - object that have JSON representation of current autheticated user
-  `locals.flash` - flash messages used by [connect-flash](https://github.com/jaredhanson/connect-flash) middleware
-  `locals.hostUrl` - current host url from config object


Example:
```javascript

    //extending application middleware
    Hunt.extendMiddleware(function (core) {
      return function (req, res, next) {
        res.setHeader('globMiddleware', core.someVar);
        next();
      };
    });
    //setting middleware for production environment only
    Hunt.extendMiddleware('production', function (core) {
      return function (req, res, next) {
        res.setHeader('prodMiddleware', core.someVar);
        next();
      };
    });
    //setting middleware for development environment only
    Hunt.extendMiddleware('development', function (core) {
      return function (req, res, next) {
        res.setHeader('devMiddleware', core.someVar);
        next();
      };
    });
    //setting middleware for specified path and development environment only
    Hunt.extendMiddleware('development', '/somePath', function (core) {
      return function (req, res, next) {
        res.setHeader('devMiddleware1', core.someVar);
        next();
      };
    });
    //setting middleware for specified path and production/staging environments only
    Hunt.extendMiddleware(['production','staging'], '/somePath', function (core) {
      return function (req, res, next) {
        res.setHeader('devMiddleware2', core.someVar);
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


Hunt.extendRoutes(function(core){...});
====================
Set custom application routes. All this routes ARE affected by extendMiddleware functions.

```javascript

    Hunt.extendRoutes(function (core) {
      core.app.get('/', function (req, res) {
        res.render('index', {
          'title': 'Hunt',
          'description': 'nodejs framework to speed up development'
        });
      });
    });
```


Set REST api endpoints
====================
Hunt have [express-resource](https://github.com/visionmedia/express-resource) package installed.
We can easily set [RESTfull](https://en.wikipedia.org/wiki/REST) api endpoints like this

```javascript

    Hunt.extendRoutes(function(core){
      core.app.resource('forums', {
        'index': function(req, res){        // GET /forums
                   res.send('forum index');
                 },
         'new': function(req, res){         // GET /forums
                  res.send('new forum');
                },
         'create': ...,                     // POST /forums
         'show':...                         // GET /forums/:forum
         'edit':                            // GET /forums/:forum/edit
         'update':                          // PUT /forums/:forum
         'destroy':...                      // DELETE /forums/:forum
      });
    });

```

User model
====================
Hunt have working users model from the box, with mongo backend for storing users' documents' collection and
[passport.js](http://passportjs.org/) framework integration. The users' sessions are set by HTTP-only cookie with redis as
session storage, so if we use single redis database as sessions storage, we can make cluster spread by few servers to have
the same users sessions.
We can access the users' collection Active Record object in this ways:


```javascript
    //from every part of code, this function logs to console the users from users' collection of application
    Hunt.once('start', function () {
      Hunt.model.User.find({}, function(err,usersFound){
        if(err){
          throw err;
        } else {
          var i = 0;
          console.log('This users have registered to our Hunt application, some of them are online:');
          usersFound.map(function(user){
            i++;
            console.log(i+' : '+user.id+' : ' + (user.isOnline ? 'online':'offline'));
          });
          Hunt.stop();
          process.exit(0);
        }
      });
    });

    //this function shows how we can access the current user authenticated in express.js controller
    Hunt.extendRoutes(function(core){
      core.app.get('/myself', function(req,res){
        if(req.user){
          res.json(req.user);
        } else {
          res.send(403);
        }
      });
    });

    //this function shows how we can access users model in expressjs controller
    //the chaining is used, because the req.model.User is mongoose model, that accepts queries
    //see http://mongoosejs.com/docs/queries.html

    Hunt.extendRoutes(function(core){
      core.app.get('/usersOnline', function(req,res){
        req.model.User.find({'isOnline':true})
          .sort('-lastSeenOnline')
          .limit(10)
          .skip(0)
          .exec(function(err,usersFound){
            if(err){
              throw err;
            } else {
              response.json(usersFound);
            }
          });
      });
    });

```

`Hunt.model.User` and `req.model.User` are mongoose active record documents collection, they have all mongoose methods
applicable to them - see [http://mongoosejs.com/docs/documents.html](http://mongoosejs.com/docs/documents.html)
and [http://mongoosejs.com/docs/queries.html](http://mongoosejs.com/docs/queries.html)


User model - example of users profile stored in database
====================


```javascript

    {
    __v: 3, //used by mongoose for data integrity
    _id: 52c5b048e06e5f1908000002, //document id
    id: '52c5b048e06e5f1908000002', //document id to string



    //credentials used for authorization - see next part of readme for details
    keychain: {
      email: 'ostroumov095@gmail.com',
      github: 'vodolaz095',
      twitter: '', //sorry, i do not use twitter
      vkontakte: 'vodolaz095'
      },

    profile: //custom object that stories everything!
     {
       bookmarks: [ 528552654466034539336060, 52855265446603453933607b ]
       rifles: [{
         'name': 'Toz-66',
         'caliber': 12
       }]

     },
    //documents' id of groups user is a member of
    groups: [ 528552654466034539336061, 528552654466034539336062],

    //access control
    isBanned: false,
    root: true,
    accountVerified: true,

    //display name of this user
    displayName: 'vodolaz095',
    name: { givenName: 'Anatolij', familyName: 'Ostroumov' },

    //api key used for one-to-one user-session relations, and huntKey authorization. Key can change often, without impact on users profile
    apiKey: '022eed8cfed8c578b354dd163073cf122ac895784d0292c3a8e31ae3de1893b5b3ae11de81e9787b2d132e47bf95a90dd11eadaa8878007b393fd5ac391400d8',
    apiKeyCreatedAt: Thu Jan 02 2014 22:30:32 GMT+0400 (MSK),

    //hashed password, and salf for it
    password: '82cc5b142afaa7a90c3759e698097c2d4adede764957d0b257b9c32c8b24a811de8c2c775e2521b6d965a0b03a4300833fe6e14f8ad1e7987f8994655e70979c',
    salt: 'ac195194f4504853f43e8d946222dbf0d03b01a155817d5f5b2c78dc3a83b12a261de876b8bb784f930a52baa613f09792038124a9806e1caf993fa64462793a',

    //valid gravatar urls, generated from email, or id if email is not present
    gravatar100: 'https://secure.gravatar.com/avatar/99c047713863fc40960ec2d8e3897489.jpg?s=100&d=wavatar&r=g',
    gravatar80: 'https://secure.gravatar.com/avatar/99c047713863fc40960ec2d8e3897489.jpg?s=80&d=wavatar&r=g',
    gravatar50: 'https://secure.gravatar.com/avatar/99c047713863fc40960ec2d8e3897489.jpg?s=50&d=wavatar&r=g',
    gravatar30: 'https://secure.gravatar.com/avatar/99c047713863fc40960ec2d8e3897489.jpg?s=30&d=wavatar&r=g',
    gravatar: 'https://secure.gravatar.com/avatar/99c047713863fc40960ec2d8e3897489.jpg?s=80&d=wavatar&r=g',

    //email, shortcut to `keychain.email`
    email: 'ostroumov095@gmail.com',


    lastSeenOnline:  1389208345431, //epoch time when user was online
    lastSeenOnlineAgo: 23, //computed value - seconds ago
    isOnline: false //user counted as online, if `lastSeenOnlineAgo` is less than 1 minute
    }

```

Note: The `profile` field of user account is changed by command `user.saveProfile(profile, function(err){...})`, because this
field is not affected by mongoose middlewares, and we need to explicitly mark is as modified to be saved/changed.


User model - authorization by keychain
====================
This functions are used on Active Record User object.
To find users we can call:

- `Hunt.model.User.findOneByEmail(email, function(error, userFound){...})`
- `Hunt.model.User.findOneByApiKey(apiKey, function(error, userFound){...})`
- `Hunt.model.User.findOneByKeychain(provider,id, function(error, userFound){...})`
- `Hunt.model.User.find({}, function(error, userFound){...})`  - standart mongoose query

For signing in (aka authorizing in application) with username and password (local strategy for passport.js framework)
this functions are used:

- `Hunt.model.User.signIn(userNameOrEmail, password, function(error, userFound){...})`
- `Hunt.model.User.signUn(userNameOrEmail, password, function(error, userSignedIn){...})`
- `Hunt.model.User.findOneByApiKeyAndResetPassword(apiKey, newPassword, function(error, userFoundAndUpdated){})` - resets the password for user, used by following link in email address, where user have to enter new password to change it
- `Hunt.model.User.findOneByApiKeyAndVerifyEmail(apiKey, function(error, userFoundAndUpdated){})` - changes the accountVerified field to true, used in account confirmation by link in email message

For oAuth profiles:
- `Hunt.model.User.processOAuthProfile(user, profile, function(error,userFoundOrUpdated){...})`;

This function is used to authorize by oauth or attach new item to keychain of profile, i mean if user have authorized by
github, he can attach twitter profile to his account, and authorize in both ways. Example of this is here
[https://github.com/vodolaz095/hunt/blob/master/lib/passportStrategies/github.js](https://github.com/vodolaz095/hunt/blob/master/lib/passportStrategies/github.js)




User model - groups
====================
I'll write documentation on it soon.

User model - dialog and group chat messaging
====================
I'll write documentation on it soon.


ApiKey authorization
====================
If you pass a config object with field of `hunkey` to constructor

```javascript

    var hunt = require('hunt');
    var Hunt = hunt({
     //some values
     'huntKey':true
     //some values
    });

```

the session less authorization is enabled.

-  For every 'GET' request you can add field of `huntKey` to authorize user by his/her apiKey. For example  - `GET /somePrivatePageOnlyForAuthorizedUsers?huntKey=ab88ec5ed3779ee707f109abf06b5dc6c82a59`

-  For every 'POST' request you can add field of `huntKey` to authorize user by his/her apiKey, for example, this jquery
code is used to make post request with authorization to add new trophy in [example](https://github.com/vodolaz095/hunt/blob/master/examples/restApi.js)

```javascript

    $.post('/trophies',{
      'name': 'Alan Schaefer',
      'scored': false,
      'huntKey':'ab88ec5ed3779ee707f109abf06b5dc6c82a59'
    });

```

-  Also you can add custom header `huntkey` to authorize user by his/her apiKey. Be advised - nodejs accepts headers only in lowercase, so you need to use `huntkey` not `huntKey`!

You can use this authentication system, if you do not want to use cookie sessions.
See this unit test as example [https://github.com/vodolaz095/hunt/blob/master/test/huntkey.test.js](https://github.com/vodolaz095/hunt/blob/master/test/huntkey.test.js)



Event emitting system
====================
I'll write documentation on it soon.

Socket.io integration
====================
I'll write documentation on it soon.

License
====================
The MIT License (MIT)

Copyright (c) 2013 Ostroumov Anatolij <ostroumov095 at gmail dot com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/vodolaz095/hunt/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

