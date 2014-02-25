/**
 * Example, that logs to console all users in default mongo database
 */

var hunt = require('./../index.js'),
  Hunt = hunt({
    'enableMongoose': true,
    'enableMongooseUsers': true
  });


Hunt.once('start', function () {
  Hunt.model.User.find({}, function (err, usersFound) {
    if (err) {
      throw err;
    } else {
      var i = 0;
      console.log('This users have registered to our Hunt application, some of them are online:');
      usersFound.map(function (user) {
        i++;
        console.log(i + ' : ' + user.id + ' : ' + (user.isOnline ? 'online' : 'offline'));
      });
      Hunt.stop();
      process.exit(0);
    }
  });
});

Hunt.startBackGround();
