module.exports = exports = function(core) {
  core.app.get('/profile', function(req,res){
    if (req.user) {
      res.render('cabinet/profile',
        {
          'title': 'Hunt authorization example',
          'description': 'Your profile'
        });
    } else {
      res.redirect('/');
    }
  });

  core.app.get('/profile', function(req,res){
    if (req.user) {
      res.render('cabinet/profile',
        {
          'title': 'Hunt authorization example',
          'description': 'Your profile'
        });
    } else {
      res.redirect('/');
    }
  });

  core.app.get('/myself', function (req, res) {
    if (req.user) {
      res.json(req.user);
    } else {
      res.send(403);
    }
  });

  core.app.get('/auth/resetPassword', function (req, res) {
    if (req.user) {
      res.redirect('/profile');
    } else {
      res.render('cabinet/resetPasswordStage1', {
        'title': 'Reset password for account',
        'description': 'We can help you'
      });
    }
  });

}