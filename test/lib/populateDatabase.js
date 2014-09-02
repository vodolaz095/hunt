module.exports = exports = function (core, done) {
  done = done || function (err) {
    if (err) {
      throw err;
    }
  };
  core.async.parallel({
    'userRoot': function (cb) {
      core.model.User.findOneAndUpdate({
          'huntKey': 'i_am_root'
        }, {
          'root': true
        }, {
          'upsert': true
        },
        cb);
    },
    'userNonRoot': function (cb) {
      core.model.User.findOneAndUpdate({
          'huntKey': 'i_am_prep'
        }, {
          'root': false,
          'name': {
            'familyName': 'Васильев',
            'middleName': 'Алексей',
            'givenName': 'Артёмович'
          }
        }, {
          'upsert': true
        },
        cb);
    }
  }, function (error, obj) {
    if (error) {
      throw error;
    } else {
      core.model.Article.findOneAndUpdate(
        { 'name': 'Книжка о хрущике' },
        {
          'name': 'Книжка о хрущике',
          'content': 'Мучной хрущик дышит жопой',
          'author': obj.userNonRoot._id
        },
        { 'upsert': true },
        function (error, articleCreated) {
          if (error) {
            throw error;
          } else {
            console.log('Access API as ROOT\n http://localhost:3000/api/v1/article?huntKey=' + obj.userRoot.apiKey);
            console.log('Access API as LIMITED\n user http://localhost:3000/api/v1/article?huntKey=' + obj.userNonRoot.apiKey);
            console.log('Article created', articleCreated);
            done(null);
          }
        }
      );
    }
  });
};