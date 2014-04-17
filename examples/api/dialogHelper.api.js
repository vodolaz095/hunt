module.exports = exports = function(core){

  core.app.get('/dialog', function (req, res) {
    var skip = 50*parseInt(req.query.page);
    req.model.User
      .find()
      .skip(skip)
      .limit(50)
      .sort('-_id')
      .exec(function(error, usersFound){
        res.render('dialog/index', {
          'title': 'Hunt dialog system example',
          'description': 'Choose somebody to talk to.',
          'id': req.query.id,
          'users': usersFound
        });

      });
  });

  core.app.get('/dialog/:id', function (req, res) {
    if (req.user) {
      req.model.User.findOne({'_id': req.params.id}, function (err, userFound) {
        if (err) {
          throw err;
        } else {
          if (userFound) {
            if (userFound.id == req.user.id) {
              req.flash('error', 'Talking to yourself is very interesting)');
              res.redirect('/dialog');
            } else {
              userFound.getDialog(req.user, 100, 0, function(err, messages){
                if(err){
                  throw err;
                } else {
                  res.render('dialog/dialog', {
                    'title':'Dialog with user "'+userFound.displayName+'"',
                    'user': userFound,
                    'messages': messages
                  });
                }

              });
            }
          } else {
            req.flash('error', 'User with this id do not exists!');
            res.redirect('/dialog');
          }
        }
      });
    } else {
      req.flash('error', 'Authorize or register please!');
      res.redirect('/auth/login' + req.params.id);
    }
  });
};