/**
 * Dialog example - user authorizes by login and password, and can interact with other users, if he is given the key
 */
var hunt = require('./../index.js');

var config = {
  'io': {
    'loglevel': 2
  },
  //for password strategies
  'passport': {
    'local': true //authorization by username/email and password, POST to /auth/login
  },
  'dialog': true,//enable dialogs api on /api/dialog
  'public': __dirname + '/public', //directory for assets - css, images, client side javascripts
  'views': __dirname + '/views' //directory for templates
};

var Hunt = hunt(config);

/**
 * Settig up static assets - css and javascripts
 */
Hunt.extendApp(function (core) {
  core.app.locals.css.push({'href': '/css/style.css', 'media': 'screen'});
  core.app.locals.javascripts.push({'url': '//yandex.st/jquery/2.0.3/jquery.min.js'});
  core.app.locals.javascripts.push({'url': '/javascripts/dialog.js'});
});

/**
 * Setting routes
 */
Hunt.extendRoutes(function (core) {
  core.app.get('/', function (req, res) {
    res.render('dialog', {
      'title': 'Hunt dialog system example',
      'description': 'If you know user\'s key, you can chat with him/her.',
      'id': req.query.id
    });
  });

  core.app.post('/', function (req, res) {
    if (req.body.id) {
      res.redirect('/' + req.body.id);
    } else {
      res.redirect('/');
    }
  });

  core.app.get('/:id', function (req, res) {
    if (req.user) {
      req.model.User.findOne({'_id': req.params.id}, function (err, userFound) {
        if (err) {
          throw err;
        } else {
          if (userFound) {
            if (userFound.id == req.user.id) {
              req.flash('error', 'Talking to yourself is very interesting)');
              res.redirect('/');
            } else {
              res.send('ok');
            }
          } else {
            req.flash('error', 'User with this id do not exists!');
            res.redirect('/');
          }
        }
      });
    } else {
      req.flash('error', 'Authorize or register please!');
      res.redirect('/?id=' + req.params.id);
    }
  });
});

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

