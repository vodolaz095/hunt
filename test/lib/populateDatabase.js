"use strict";

module.exports = exports = function (core, done) {
  done = done || function (err) {
    if (err) {
      throw err;
    }
  };

  function giveMeASec(cb) {
    setTimeout(cb, 200);
  }

  core.async.series([
    function (cb) {
      core.model.User.remove({}, cb);
    },
    giveMeASec,
    function (cb) {
      core.model.Article.remove({}, cb);
    },
    giveMeASec,
    function (cb) {
      core.model.User.create({
        'huntKey': 'i_am_root',
        'root': true
      }, cb);
    },
    function (cb) {
      core.model.User.create({
        '_id': '54a6168aa027eb0326220518',
        'id': '54a6168aa027eb0326220518',
        'huntKey': 'i_am_prep',
        'root': false,
        'name': {
          'familyName': 'Васильев',
          'middleName': 'Алексей',
          'givenName': 'Артёмович'
        }
      }, cb);
    },
    giveMeASec,
    function (cb) {
      core.model.Article.create({
        '_id': '53b43aded6202872e0e3371f',
        'id': '53b43aded6202872e0e3371f',
        'name': 'Книжка о хрущике',
        'content': 'Мучной хрущик дышит жопой',
        'author': '54a6168aa027eb0326220518'
      }, cb);
    }
  ], function (error) {
    if (error) {
      throw error;
    } else {
      console.log('Access API as ROOT\n http://localhost:3000/api/v1/article?huntKey=i_am_root');
      console.log('Access API as LIMITED\n user http://localhost:3000/api/v1/article?huntKey=i_am_prep');
      done(null);
    }
  });
};