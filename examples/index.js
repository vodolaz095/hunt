/*
 * Full example, user authorization, REST interface for trophies,
 * socket.io notifications, dialog system
 */
'use strict';

var
  populateDb = require('./lib/populateDatabase.js'),
  pinger = require('./lib/pinger.js');

//default values are commented out
var config = {
  //'secret' : 'someLongAndHardStringToMakeHackersSadAndEldersHappy', //populated from environment
  //'port' : 3000,
  //'env' : 'production',
  //'hostUrl': 'http://huntdemo.herokuapp.com/', //populated from environment
  //'redisUrl' : 'redis://somehost.com:6379',
  //'mongoUrl' : 'mongo://localhost/hunt_dev',
  //'uploadFiles': false, // do not allow upload of files by HTTP-POST
  //'enableMongoose' : true,
  //'enableMongooseUsers' : true,
  'usersApi': true,
  //'disableCsrf': true,
  //for password strategies
  'passport': {
//    'sessionExpireAfterSeconds':180,
    'local': true, //authorization by username/email and password, POST to /auth/login
    'signUpByEmail': true, //user can signup by making POST /auth/signhup with email and password
    'verifyEmail': true, //user have to follow link in email address
    'verifyEmailTemplate': 'email/verifyEmail', //template for verifying email message
    'resetPasswordEmailTemplate': 'email/resetEmail', //template for email used for reseting password
    'resetPasswordPageTemplate': 'cabinet/resetPasswordStage2',
    'resetPassword': true, //allow user to reset password for account

//authorization by Steam openid account, GET /auth/steam
    'steam': true

// Google OAuth2 Strategy
//    'GOOGLE_CLIENT_ID': '323040484611-82ju1isetg8dkbvgb.apps.googleusercontent.com',
//    'GOOGLE_CLIENT_SECRET': 'SECRETSECRET',

// Default scopes for Google OAuth 2.0 strategy
//   'GOOGLE_SCOPES': [
//      'https://www.googleapis.com/auth/userinfo.profile',
//      'https://www.googleapis.com/auth/userinfo.email'
//   ],
// Github oAuth strategy, GET /auth/github
//populated from environment values
//    'GITHUB_CLIENT_ID': '1fca293397b695386e24', //obtainable here - https://github.com/settings/applications
//    'GITHUB_CLIENT_SECRET': 'SECRETSECRET',

// twitter oAuth strategy, GET /auth/twitter
// populated from environment values
//    'TWITTER_CONSUMER_KEY': 'CrFlQq2QbOPvE4u6Ltg', //obtainable here - https://dev.twitter.com/apps
//    'TWITTER_CONSUMER_SECRET': 'SECRETSECRET',

//vk.com oAuth strategy, GET /auth/vk
// populated from environment values
//    'VK_APP_ID': '3058595', //you can get more information here - https://vk.com/dev/native
//    'VK_APP_SECRET': 'SECRETSECRET',

//facebook oAuth stragegy, GET /auth/facebook
// populated from environment values
//    'FACEBOOK_CLIENT_ID': '1415057178733225',
//    'FACEBOOK_CLIENT_SECRET': 'SECRETSECRET'
  },
  'huntKey': true, //disallow huntKey authorization by GET query field and POST,PUT,DELETE body parameter. Default is false - denied
  'huntKeyHeader': true, //allow huntKey authorization by header. Default is false - denied
  'io': true, //enable socket.io support
  'dialog': true,//enable dialogs api on /api/dialog
  'public': __dirname + '/public', //directory for assets - css, images, client side javascripts
  'views': __dirname + '/views', //directory for templates

  //'emailConfig':false, //we use directmail transport
  'maxWorkers': 1
};

//We build application instance
var hunt = require('./../index.js')(config);

/*
 * Creating mongoose model of Trophies
 * So, this model is accessible by hunt.model.Trophy
 * and by request.model.Trophy in controllers
 */
hunt.extendModel('Trophy', require('./models/trophy.model.js'));


hunt.extendApp(function (core) {
//loading client side javascripts/css from public cdns

  core.app.locals.css.push({'href': '//yandex.st/bootstrap/3.3.4/css/bootstrap.min.css', 'media': 'screen'});
  core.app.locals.javascripts.push({'url': '//yandex.st/jquery/2.1.4/jquery.min.js'});
  core.app.locals.javascripts.push({'url': '//yandex.st/bootstrap/3.3.4/js/bootstrap.min.js'});
  core.app.locals.javascripts.push({'url': '//cdnjs.cloudflare.com/ajax/libs/async/1.4.2/async.js'});
  core.app.locals.javascripts.push({'url': '//ajax.googleapis.com/ajax/libs/angularjs/1.4.7/angular.min.js'});
  core.app.locals.javascripts.push({'url': '//ajax.googleapis.com/ajax/libs/angularjs/1.4.7/angular-route.min.js'});
  core.app.locals.javascripts.push({'url': '//ajax.googleapis.com/ajax/libs/angularjs/1.4.7/angular-resource.min.js'});

// we set server side template engine delimiters to be
// different from the ones used by AngularJS
  core.app.locals.delimiters = '[[ ]]';

  core.app.locals.javascripts.push({'url': '/hunt.ng.js'});
  core.app.locals.javascripts.push({'url': '/app.ng.js'});
  /*
   * Setting up menu - one of many possible approaches
   */
  core.app.locals.menu = [
    {'url': '/documentation', 'name': 'Documentation'},
    {'url': 'http://docs.huntjs.apiary.io/', 'name': 'API Blueprint'},
    {'url': '/#/events', 'name': 'Events Demo'},
    {'url': '/#/crud', 'name': 'CRUD Demo'},
    {'url': '/#/cache', 'name': 'Caching Demo'},
    {'url': '/#/cluster', 'name': 'Invincibility Demo'}
  ];
});

/*
 * Setting up the expressjs application
 */

hunt.extendController('/', function (core, router) {
  /*
   * Middleware to redirect to https on production environment
   */
  router.use(core.forceHttps);

  /*
   * Setting middleware to irritate user who have not verified his account
   */
  router.use(function (req, res, next) {
    if (req.user) {
      if (req.user.accountVerified) {
        next();
      } else {
        req.flash('error', 'Verify your email address please!');
        next();
      }
    } else {
      next();
    }
  });

  /*
   * Setting custom routes
   */
  router.get('/', function (req, res) {
    res.render('index', {
      'title': 'HuntJS V' + core.version + ' demo',
      'description': 'mix expressjs, mongoose, sequilize, socketio and passportjs'
    });
  });

  /*
   * Rendering Jade templates
   */
  router.get('/jade', function (req, res) {
    res.render('jade.jade', {
      'title': 'HuntJS V' + core.version + ' demo',
      'description': 'We use Jade template!'
    });
  });

  /*
   * Rendering Handlebars templates
   */
  router.get('/handlebars', function (req, res) {
    res.render('hbs.hbs', {
      'title': 'HuntJS V' + core.version + ' demo',
      'description': 'We use Handlebars template!',
      'layout': false
    });
  });

  /*
   * Rendering Swig templates
   */
  router.get('/swig', function (req, res) {
    res.render('swig.swig', {
      'title': 'HuntJS V' + core.version + ' demo',
      'description': 'We use Swig template!',
      'layout': false
    });
  });

  /*
   * Routes to test notifications
   */
  router.post('/notify_me', function (req, res) {
    if (req.user && req.user.email) {
      req.user.notifyByEmail({'template': 'email/hello', 'layout': false});
      req.flash('success', 'Check our INBOX, please!');
      res.redirect('/#/profile');
    } else {
      req.flash('error', 'Unable to send notification - either your are not authorized or haven\'t provided a email.');
      res.redirect('back');
    }
  });

  /*
   * Page for users to authorize
   */
  router.get('/auth/login', function (req, res) {
    if (req.user) {
      res.redirect('/profile');
    } else {
      res.render('cabinet/login', {
        'layout': false
      });
    }
  });

  /*
   * Route for user to see his/her profile
   */
  router.get('/profile', function (req, res) {
    if (req.user) {
      res.render('cabinet/profile', {
        'layout': false
      });
    } else {
      res.redirect('/');
    }
  });

  /*
   * Route for user to see his/her profile too
   */
  router.get('/api/v1/myself', function (req, res) {
    if (req.user) {
      res.json({'user': req.user.toString()});
    } else {
      res.sendStatus(403);
    }
  });


  /*
   * Form where user can reset password
   */
  router.get('/auth/resetPassword', function (req, res) {
    if (req.user) {
      res.redirect('/profile');
    } else {
      res.render('cabinet/resetPasswordStage1', {
        'title': 'Reset password for account',
        'description': 'We can help you'
      });
    }
  });

  /* route to cruelly kill this helpless nodejs process,
   * and make cluster spawn another one to make you
   * happy killing it too)
   */
  router.get('/boom', function (req, res) {
    setTimeout(function () {
      core.stop();
      process.exit(0);
    }, 100);
    res.redirect('/');
  });

  /*
   * route to throw some stupid error,
   * that will be catch by error reporter middleware and will not stop the process
   */
  router.all('/error', function () {
    throw new Error('Something is wrong... Please, wipe your spectacles with alcohol or spirit and carefully kick PC with hammer 3 times.');
  });

  /*
   *  route to throw some really vicious error,
   *  that cannot be catch by error reporter middleware, but will be catch by
   *  *domain* and will not stop the process.
   */
  router.all('/baderror', function () {
    (function () {
      throw new Error('Catch this!');
    }());
  });

  /*
   * route to demonstrate caching middleware
   */
  router.get('/time', core.cachingMiddleware(3000), function (request, response) {
    response.send('Current time is ' + new Date());
  });
});

/*
 * Exporting Trophy model as REST interface
 */
hunt.exportModelToRest({
  'mountPount': '/api/v1/trophy',
  'modelName': 'Trophy',
  'ownerId': 'author'
});

/*
 * Exporting User model as REST interface
 */
hunt.exportModelToRest({
  'mountPount': '/api/v1/user',
  'modelName': 'User',
  'ownerId': '_id'
});

/*
 * Exporting Message model as REST interface
 */
hunt.exportModelToRest({
  'mountPount': '/api/v1/message',
  'modelName': 'Message',
  'ownerId': 'from'
});

/*
 * setting up the event handlers
 */

//event that is emmited on any successefull http request processed
hunt.on('http:success', function (httpSuccess) {
  if (httpSuccess.body && httpSuccess.body.password) {
    httpSuccess.body.password = '************'; //because we do not want to stream passwords!
  }
  hunt.emit('broadcast', {'type': 'httpSuccess', 'httpSuccess': httpSuccess});
//  console.log(httpSuccess);
});

//event that is emitted on any error thrown in any of controllers
//also we notify admin by email - (see http://huntjs.herokuapp.com/documentation/config.html - adminEmail)
//that there is some sort of error
//by default it is done by direct mail transport, so it will work alwayes,
//but the message will likely be marked as spam
hunt.on('http:error', function (err) {
  console.error(err);
});


hunt.onSocketIoEvent('pingerUrl', function (payload, socket) {
  pinger(payload, socket);
});

hunt.once('start', function (startParameters) {
//we process socket.io events here.
//note, that Hunt.io is generated only after
//application is started
  switch (startParameters.type) {
  case 'webserver':
//if application is started as background service, it do not have socket.io support
    if (hunt.config.io.enabled) {
      hunt.io.on('connection', function (socket) {
        socket.on('pingerUrl', function (payload) {
          pinger(payload, socket);
        });
      });
    }
    setInterval(function () {
      hunt.emit('broadcast', {'type': 'currentTime', 'time': Date.now()}); //to be broadcasted by socket.io
    }, 500);
    break;
  case 'background':
    populateDb(hunt);
    setInterval(function () {
      populateDb(hunt);
    }, 60 * 5000);
    break;
  default:
    console.log('We started application as ', startParameters.type);
  }
});

/*
 * Listening to socket.io events, emitted by client
 */
hunt.on('message:sio', function (event) {
  console.log('We received socket.io event!', event);
});

/*
 * Profiling
 */
function profilingListener(payload) {
  /* jshint -W040*/
  var e = this.event;
  console.log('>>>PROFILING', e, payload, '<<<');
  /* jshint +W040*/
}
//various means to perform it:

//hunt.on('profiling:*', profilingListener);
//hunt.on('profiling:redis:*', profilingListener);
//hunt.on('profiling:mongoose:*', profilingListener);
//hunt.on('profiling:mongoose:hunt_dev:*', profilingListener);
//hunt.on('profiling:mongoose:hunt_dev:users:ensureIndex', profilingListener);
//hunt.onAny(profilingListener);
hunt.on('start', profilingListener);

//listening on REST interface events
hunt.on(['REST:*'], profilingListener);


/*
 * Starting cluster of webserveres
 * We start 2 worker processes and 1 master process
 * But let us let Hunt to decide
 * how many worker process is spawned (1 for every CPU core present)
 * and what port to use (from config or process.env.PORT or default - 3000)
 * we recommend 1 process per CPU core
 */
if (hunt.startCluster({'web': 1})) { // Hunt#startCluster returns true for MASTER process
  console.log('We have started master process #' + process.pid);
} else {
  console.log('We have started child process #' + process.pid);
}
