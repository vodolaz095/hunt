module.exports = exports = function(core){

  core.app.get('/dialog', function (req, res) {
    res.render('dialog/index', {
      'title': 'Hunt dialog system example',
      'description': 'If you know user\'s key, you can chat with him/her.',
      'id': req.query.id
    });
  });

  core.app.post('/dialog', function (req, res) {
    if (req.body.id) {
      res.redirect('/dialog/' + req.body.id);
    } else {
      res.redirect('/');
    }
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
            res.redirect('/');
          }
        }
      });
    } else {
      req.flash('error', 'Authorize or register please!');
      res.redirect('/?id=' + req.params.id);
    }
  });
};