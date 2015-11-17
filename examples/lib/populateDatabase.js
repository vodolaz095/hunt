'use strict';

var preys = [
  {
    '_id': '557caf8ee7c36e8011b92ea7',
    'name': 'Alan Schaefer',
    'scored': false,
    'priority': 10
  },
  {
    '_id': '557caf8ee7c36e8011b92ea8',
    'name': 'George Dillon',
    'scored': true,
    'priority': 9
  },
  {
    '_id': '557caf8ee7c36e8011b92ea9',
    'name': 'Rick Hawkins',
    'scored': true,
    'priority': 8
  },
  {
    '_id': '557caf8ee7c36e8011b92eaa',
    'name': 'Blain Cooper',
    'scored': true,
    'priority': 7
  },
  {
    '_id': '557caf8ee7c36e8011b92eab',
    'name': 'Billy Sole',
    'scored': true,
    'priority': 6
  },
  {
    '_id': '557caf8ee7c36e8011b92eac',
    'name': 'Anna Goncalves',
    'scored': false,
    'priority': 0
  }
];

//populating the trophies' collection in database
module.exports = exports = function (hunt) {
  var gameMasterId;
  hunt.async.series([
    function (cb) {
      hunt.model.Trophy.remove({}, cb);
    },
    function (cb) {
      hunt.model.User.remove({ 'huntKey': 'i_am_game_master_grr' }, cb);
    },
    function (cb) {
      hunt.model.User.create({
        '_id': '55b0c81ee523c6a60c4325ad',
        'displayName': 'Gamekeeper',
        'root': false,
        'accountVerified': true,
        'huntKey': 'i_am_game_master_grr'
      }, function (error, userCreated) {
        if (error) {
          cb(error);
        } else {
          console.log('Gamekeeper created with ' + userCreated.huntKey);
          gameMasterId = userCreated.id;
          cb(null);
        }
      });
    },
    function (cb) {
      hunt.async.map(preys, function (prey, clb) {
        prey.author = gameMasterId;
        hunt.model.Trophy.create(prey, clb);
      }, cb);
    }
  ], function (error) {
    if (error) {
      throw error;
    }
  });
};
