/*
 * Dialog example - user authorizes by login and password, and can interact with other users, if he is given the key
 */
var hunt = require('./../index.js'),
  dialogHelperApi = require('./api/dialogHelper.api.js'),
  profileHelperApi = require('./api/profileHelper.api.js');

var config = {
  'io': {
    'loglevel': 2
  },
  //for password strategies
  'passport': {
    'local': true, //authorization by username/email and password, POST to /auth/login,
    'signUpByEmail': true, //user can signup by making POST /auth/signhup with email and password
    'verifyEmail': true, //user have to follow link in email address
    'verifyEmailTemplate': 'email/verifyEmail', //template for verifying email message
    'resetPasswordEmailTemplate': 'email/resetEmail', //template for email used for reseting password
    'resetPasswordPageTemplate': 'cabinet/resetPasswordStage2',
    'resetPassword': true, //allow user to reset password for account
  },
  'dialog': true,//enable dialogs api on /api/dialog
  'public': __dirname + '/public', //directory for assets - css, images, client side javascripts
  'views': __dirname + '/views' //directory for templates
};

var Hunt = hunt(config);

/*
 * Settig up static assets - css and javascripts
 */
Hunt.extendApp(function (core) {
  core.app.locals.css.push({'href': '/css/style.css', 'media': 'screen'});
  core.app.locals.javascripts.push({'url': '//yandex.st/jquery/2.0.3/jquery.min.js'});
  core.app.locals.javascripts.push({'url': '/javascripts/hunt.js'});
});

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
 * Setting custom routes
 */
Hunt.extendRoutes(function (core) {
  core.app.get('/', function (req, res) {
    res.render('dialog/index', {
      'title': 'Hunt dialog system example',
      'description': 'If you know user\'s key, you can chat with him/her.',
      'id': req.query.id
    });
  });
});

/*
 * Setting some shared routes
 */
Hunt.extendRoutes(dialogHelperApi);
Hunt.extendRoutes(profileHelperApi);

Hunt.once('dts', console.info); //catching `dts` event`

Hunt.once('start', function () {
  setInterval(function () {
    var now = new Date().toLocaleTimeString();
    Hunt.emit('dts', 'Time now is ' + now); //to be catched by console
    Hunt.emit('broadcast', {'time': now}); //to be broadcasted by socket.io
  }, 500);
});

/**
 * Starting webserver
 */
Hunt.startWebServer();

