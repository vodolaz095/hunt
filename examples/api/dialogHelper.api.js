module.exports = exports = function(core){

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
              res.redirect('/');
            } else {
              userFound.getRecentMessages(100, 0, function(err, messages){
                if(err){
                  throw err;
                } else {
                  console.log(messages);
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