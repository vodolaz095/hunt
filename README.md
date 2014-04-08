HuntJS
====================

[![NPM version](https://badge.fury.io/js/hunt.svg)](http://badge.fury.io/js/hunt)
[![Build Status](https://drone.io/bitbucket.org/vodolaz095/hunt/status.png)](https://drone.io/bitbucket.org/vodolaz095/hunt/latest)
[![Build Status](https://travis-ci.org/vodolaz095/hunt.png?branch=master)](https://travis-ci.org/vodolaz095/hunt)

**"Hello, world!" Example**

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

**Documentation and live example**

[https://huntjs.herokuapp.com/](https://huntjs.herokuapp.com/)


**More examples**

[https://github.com/vodolaz095/hunt/tree/master/examples/](https://github.com/vodolaz095/hunt/tree/master/examples/)

**Shameless advertisement**

You can hire the author of this package by Odesk - [https://www.odesk.com/users/~0120ba573d09c66c51](https://www.odesk.com/users/~0120ba573d09c66c51s)

**What do you get from the box?**

Just run `npm install hunt` and you get ready to use high level nodejs framework,
that links together many preconfigured and working perfectly together modules.
This is it. *Hunt*...

-  works on latest versions of [NodeJS](http://nodejs.org) >=0.10.26

-  is a real event driven (by pattern [Observer](https://en.wikipedia.org/wiki/Observer_pattern))
   framework build on top of [ExpressJS](http://expressjs.com),
   suitable not only for creating HTTP-based web applications, but background services,
   binary protocol applications, websockets or even xmpp based applications.

-  [Mongo database](http://www.mongodb.org/) and
    [Mongoose ORM](http://mongoosejs.com/) support from the box

-  [sequelizejs](http://sequelizejs.com/) ORM for [MySQL](https://www.mysql.com/),
   [PostgreSQL](http://www.postgresql.org/), [sqlite](https://www.sqlite.org/)
   and [MariaDB](https://mariadb.org/) from the box.

-  The best sides of express.js framework are supported: routing,
   [middlewares](http://expressjs.com/api.html#middleware), controllers.
   And this is done in clever way - expressjs application can be easily
   converted to Hunt application.

-  Popular templating engines are supported - [Mustache](http://mustache.github.io/mustache.5.html),
   [Swig](http://paularmstrong.github.io/swig/), [jade](https://github.com/visionmedia/jade).

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
    and [heroku](https://devcenter.heroku.com/articles/node-websockets#deploy)

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

**System requirements**

-  [Linux](http://distrowatch.com/dwres.php?resource=major) (this is your problem, if you want to build this package on other operating systems)
-  [NodeJS](http://nodejs.org/download/) >= 0.10.26 (version build from source is preferable, because hunt builds some dependencies from source)
-  [Redis](http://redis.io/download) >= 2.6.16
-  [Mongo](http://www.mongodb.org/downloads) >= 2.4.6 (optional)
-  [MySQL](https://dev.mysql.com/downloads/mysql/) >= 5.6.16 (optional)
-  [PostgreSQL](http://www.postgresql.org/download/) >= 9.2 (optional)


**Important!**

Without understanding how [express.js framework](http://expressjs.com/) operates, including

 - concept of [app](http://expressjs.com/api.html#express),
 - concept of [middleware](http://expressjs.com/api.html#middleware) and how [it can be used](http://webapplog.com/intro-to-express-js-parameters-error-handling-and-other-middleware/)
 - concept of chaining the middlewares (this is example of adding middleware to a chain [to count users online](http://expressjs.com/guide.html#users-online))
 - concept [route](http://expressjs.com/api.html#app.VERB)

this module is hard to understand. Please, read this information above before processing with this framework.


**Deploying the HuntJS application for production**

We will post some advices on server configuration here:
[https://github.com/vodolaz095/hunt/tree/master/examples/serverConfigsExamples](https://github.com/vodolaz095/hunt/tree/master/examples/serverConfigsExamples)


License
====================
The MIT License (MIT)

Copyright (c) 2013 Ostroumov Anatolij <ostroumov095 at gmail dot com> et al.

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
