'use strict';

var
  winston = require('winston'),
  preys = {
    '557caf8ee7c36e8011b92ea7': {
      'name': 'Alan Schaefer',
      'scored': false,
      'priority': 10
    },
    '557caf8ee7c36e8011b92ea8': {
      'name': 'George Dillon',
      'scored': true,
      'priority': 9
    },
    '557caf8ee7c36e8011b92ea9': {
      'name': 'Rick Hawkins',
      'scored': true,
      'priority': 8
    },
    '557caf8ee7c36e8011b92eaa': {
      'name': 'Blain Cooper',
      'scored': true,
      'priority': 7
    },
    '557caf8ee7c36e8011b92eab': {
      'name': 'Billy Sole',
      'scored': true,
      'priority': 6
    },
    '557caf8ee7c36e8011b92eac': {
      'name': 'Anna Goncalves',
      'scored': false,
      'priority': 0
    }
  };

//populating the trophies' collection in database
module.exports = exports = function (hunt) {
  var gameMasterId;
  hunt.async.series([
    function (cb) {
      hunt.model.User.findOneAndUpdate({'_id': '55b0c81ee523c6a60c4325ad'}, {
        'displayName': 'Gamekeeper',
        'root': false,
        'accountVerified': true,
        'huntKey': 'i_am_game_master_grr'
      }, {
        'upsert': true
      }, function (error, userCreated) {
        if (error) {
          cb(error);
        } else {
          winston.info('Gamekeeper created with %s', userCreated.huntKey);
          gameMasterId = userCreated.id;
          cb(null);
        }
      });
    },
    function (cb) {
      hunt.async.map(Object.keys(preys), function (key, clb) {
        var p = preys[key];
        p.author = gameMasterId;
        hunt.model.Trophy.findOneAndUpdate({'_id': key}, p, {'upsert': true}, function (error, trophyUpdated) {
          if (error) {
            clb(error);
          } else {
            winston.info('Trophy updated - %s %s', trophyUpdated.id, trophyUpdated.toString());
            clb();
          }
        });
      }, cb);
    }
  ], function (error) {
    if (error) {
      throw error;
    }
  });
};
