"use strict";

var preys = [
  {
    'name': 'Alan Schaefer',
    'scored': false,
    'priority': 10
  },
  {
    'name': 'George Dillon',
    'scored': true,
    'priority': 9
  },
  {
    'name': 'Rick Hawkins',
    'scored': true,
    'priority': 8
  },
  {
    'name': 'Blain Cooper',
    'scored': true,
    'priority': 7
  },
  {
    'name': 'Billy Sole',
    'scored': true,
    'priority': 6
  },
  {
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
        'displayName': 'Gamemaster',
        'root': false,
        'huntKey': 'i_am_game_master_grr'
      }, function (error, userCreated) {
        if (error) {
          cb(error);
        } else {
          console.log('Gamemaster created with ' + userCreated.huntKey);
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
