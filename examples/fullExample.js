/*
 * Full example, user authorization, REST interface for trophies,
 * socket.io notifications, dialog system
 */

var hunt = require('./../index.js'),
  dialogHelperApi = require('./api/dialogHelper.api.js'),
  documentationApi = require('./api/documentation.api.js'),
  pinger = require('./lib/pinger'),
  profileHelperApi = require('./api/profileHelper.api.js');

var config = {
  //'secret' : 'someLongAndHardStringToMakeHackersSadAndEldersHappy', //populated from environment
  //'port' : 3000,
  //'env' : 'production',
  //'hostUrl': 'http://teksi.ru/', //populated from environment
  //'redisUrl' : 'redis://somehost.com:6379',
  //'mongoUrl' : 'mongo://localhost/hunt_dev',
  //'uploadFiles': false, // do not allow upload of files by HTTP-POST
  //'enableMongoose' : true,
  //'enableMongooseUsers' : true,

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

//authorization by gmail openid account, GET /auth/google
    'google': true

// Github oAuth strategy, GET /auth/github
//populated from enviroment values
//    'GITHUB_CLIENT_ID': '1fca293397b695386e24', //obtainable here - https://github.com/settings/applications
//    'GITHUB_CLIENT_SECRET': 'SECRETSECRET',

// twitter oAuth strategy, GET /auth/twitter
// populated from enviroment values
//    'TWITTER_CONSUMER_KEY': 'CrFlQq2QbOPvE4u6Ltg', //obtainable here - https://dev.twitter.com/apps
//    'TWITTER_CONSUMER_SECRET': 'SECRETSECRET',

//vk.com oAuth strategy, GET /auth/vk
// populated from enviroment values
//    'VK_APP_ID': '3058595', //you can get more information here - https://vk.com/dev/native
//    'VK_APP_SECRET': 'SECRETSECRET',

//facebook oAuth stragegy, GET /auth/facebook
// populated from enviroment values
//    'FACEBOOK_CLIENT_ID': '1415057178733225',
//    'FACEBOOK_CLIENT_SECRET': 'SECRETSECRET'
  },
  'io': {
    'loglevel': 0
  },
  'dialog': true,//enable dialogs api on /api/dialog
  'public': __dirname + '/public', //directory for assets - css, images, client side javascripts
  'views': __dirname + '/views', //directory for templates

  //'emailConfig':false, //we use directmail transport
  'maxWorkers':2
};

var Hunt = hunt(config);

/*
 * Creating mongoose model of Trophies
 * So, this model is accessible by Hunt.model.Trophy
 * and by request.model.Trophy in controllers
 */
Hunt.extendModel('Trophy', require('./models/trophy.model.js'));

/*
 * Settig up menu
 */
Hunt.extendApp(function (core) {
  core.app.locals.menu = [
    {'url':'/documentation','name':'Documentation'},
    {'url':'/dialog','name':'Private messages'},
    {'url':'/groups','name':'Chats'},
    {'url':'/map','name':'Map'},
    {'url':'/events','name':'Events'},
    {'url':'/trophies','name':'REST-api'}
  ];
});

/*
 * Settig up static assets - css and javascripts
 */
Hunt.extendApp(require('./lib/assetsLoader.js'));

/*
 * Setting middleware to irritate user who have not verified his account
 */
Hunt.extendMiddleware(function (core) {
  return function (req, res, next) {
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
  };
});

/*
 * Setting some shared routes
 */
Hunt.extendRoutes(dialogHelperApi);
Hunt.extendRoutes(profileHelperApi);

/*
 * Setting custom routes
 */
Hunt.extendRoutes(function(core){

  core.app.get('/', function(req, res){
    res.render('fullExampleIndex',{
      'title':'HuntJS - high level nodejs backend framework',
      'description': 'build on top of expressjs, mongoose, sequilize, socketio and passportjs'
    });
  });

/*
 * Page for users to authorize
 */
  core.app.get('/auth/login', function (req, res) {
    if (req.user) {
      res.redirect('/profile');
    } else {
      res.render('cabinet/login', {
        'title': 'Hunt authorization example',
        'description': 'Authorize please!'
      });
    }
  });

/*
 * Serving generated documentation
 */
 core.app.get('/documentation', documentationApi.index);
 core.app.get(/^\/documentation\/([0-9a-zA-Z]+)\.html$/, documentationApi.article);

/*
 * Page to demonstrate socket.io integration in few wayes
 */
  core.app.get('/events', function (req, res) {
    res.render('online', {
      'title': '\"Events\" - HuntJS socket.io examples with various events',
      'description': 'Various realtime examples - clock, recent requests, tasks, messages...'
    });
  });

/*
 * Setting route for realtime example with map
 */
  core.app.get('/map', function(req, res){
    if(req.user){
      res.render('map', {
        'title': '\"Map\" - HuntJS socket.io example with authorised users',
        'description': 'Move the mouse cursor over the map, and other users will see your position'
      });
    } else {
      req.flash('error','Please, authorize for accessing the map example!');
      res.redirect('/auth/login');
    }
  });

/*
 * Helper for "Map" example
 */
  core.app.get('/api/map.json', function(req,res){
    if(req.user){
      req.model.User
        .find({})
        .limit(100)
        .exec(function(error, usersFound){
          if(error) throw error;
          var usersProcessed = [];
          usersFound.map(function(u){
            if(u.profile && u.profile.positionX && u.profile.positionY){
              usersProcessed.push({
                'gravatar30': u.gravatar30,
                'displayName': u.displayName,
                'id': u.id,
                'left': u.profile.positionX,
                'top': u.profile.positionY
              });
            }
          });
          res.json(200, usersProcessed);
        });
    } else {
      res.send(403);
    }
  });
/*
 * Setting up api endpoind to trophies
 * https://github.com/visionmedia/express-resource
 */
  core.app.resource('trophies', require('./api/trophy.api.js'));
  core.app.resource('groups', require('./api/group.helper.api.js'));
});

/*
 * setting up the event handlers
 */

//event that is emmited on any successefull http request processed
Hunt.on('httpSuccess', function(httpSuccess){
  if(httpSuccess.body && httpSuccess.body.password){
    httpSuccess.body.password = '************'; //because we do not want to stream passwords!
  }
  Hunt.emit('broadcast', {'httpSuccess':httpSuccess});
});

//event that is emmited on any error throwed in any of controllers
//also we notify admin that there is some sort of error
//by default it is done by direct mail transport, so it will work alwayes,
//but the message will likely be marked as spam
Hunt.on('httpError', function(err){
  console.error(err);
  Hunt.sendEmail(
    process.env.ADMIN_EMAIL || 'support@example.com',
    'Our application did a bad bad thing!',
    JSON.stringify(err.stack),
    console.error);
});

Hunt.once('start', function (startParameters) {
//we populate mongoose model of Trophies with test data
  require('./lib/populateDatabase')(Hunt);

//we process socket.io events here.
//note, that Hunt.io is generated only after
//application is started

  if(startParameters.type === 'webserver'){
//if application is started as background service, it do not have socket.io support
    Hunt.io.sockets.on('connection', function(socket){
      socket.on('pingerUrl', function(payload){
        pinger(payload, socket);
      });
//Listenint to socket.io event, emmited when user hovers mouse above the map
      socket.on('position', function(payload){

//authorized user that uses this socket.io socket
        if(socket.handshake.user){
          var userToBePlaced = socket.handshake.user;
          userToBePlaced.profile = userToBePlaced.profile || {};
          userToBePlaced.profile.positionX = payload.x;
          userToBePlaced.profile.positionY = payload.y;
          userToBePlaced.save(function(error){
            if(error){
              throw error;
            } else {
              Hunt.emit('broadcast', {
                'positionUpdate': {
                  'gravatar30': userToBePlaced.gravatar30,
                  'displayName': userToBePlaced.displayName,
                  'id': userToBePlaced.id,
                  'left': userToBePlaced.profile.positionX,
                  'top': userToBePlaced.profile.positionY
                }
              });
            }
          });
        } else {
          return;
        }
      });
    });
  }

  setInterval(function () {
    var now = new Date().toLocaleTimeString();
    Hunt.emit('broadcast', {'time':now}); //to be broadcasted by socket.io
  }, 500);
});

/*
 * Listening to socket.io events, emitted by client
 */
Hunt.on('message:sio', function(event){
  console.log('We recieved socket.io event!', event);
});

/*
 * Starting cluster of webserveres
 * We start 2 worker processes and 1 master process
 * We listen to port 3000
 */

//Hunt.startWebCluster(3,3000);
/*
 *But let us let Hunt to decide
 *how many worker process is spawned (1 for every CPU core present)
 *and what port to use (from config or process.env.PORT or default - 3000)
 *we recommend 1 process per CPU core
 */


if (Hunt.config.env === 'production') {
  Hunt.startCluster({'web':'max'});
} else {
  Hunt.startWebServer();
}
