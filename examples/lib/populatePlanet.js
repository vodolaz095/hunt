'use strict';

var
  winston = require('winston'),
  planets = [
    {
      'id': 1,
      'name': 'Mercury',
      'huntingAllowed': false
    },
    {
      'id': 2,
      'name': 'Venus',
      'huntingAllowed': true
    },
    {
      'id': 3,
      'name': 'Earth',
      'huntingAllowed': true
    },
    {
      'id': 4,
      'name': 'Mars',
      'huntingAllowed': true
    },
    {
      'id': 5,
      'name': 'Jupiter',
      'huntingAllowed': false
    },
    {
      'id': 6,
      'name': 'Saturn',
      'huntingAllowed': false
    },
    {
      'id': 7,
      'name': 'Neptune',
      'huntingAllowed': false
    },
    {
      'id': 8,
      'name': 'Pluto',
      'huntingAllowed': false
    },
    {
      'id': 9,
      'name': 'Nibiru',
      'huntingAllowed': false
    },
    {
      'id': 10,
      'name': 'Sedna',
      'huntingAllowed': false
    }
  ];

module.exports = exports = function (hunt, callback) {
  callback = callback || function(error){
      if(error){
        throw error;
      }
    }

  hunt.async.series([
    function (cb) {
      hunt.sequelize.sync().then(function () {
        cb(null);
      }, cb);
    },
    function (cb) {
      hunt.model.Planet.destroy({
        where: {}
      }).then(function () {
        cb(null)
      }, cb);
    },
    function (cb) {
      hunt.async.each(planets, function (planet, clb) {
        hunt.model.Planet.create(planet).then(function (planetEntryCreated) {
          winston.info('Planet #%s - %s is recorded to database', planetEntryCreated.id, planetEntryCreated.name);
          clb()
        }, clb);
      }, cb);
    }
  ], callback);
};