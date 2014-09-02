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
  },
];

module.exports = exports = function (hunt) {
  //populating the trophies' collection in database
  hunt.model.Trophy.remove({}, function (error) {
    if (error) {
      throw error;
    } else {
      hunt.async.map(preys, function (prey, cb) {
        hunt.model.Trophy.create(prey, cb);
      }, function (error, preysSaved) {
        if (error) {
          throw error;
        } else {
          console.log('' + preysSaved.length + ' trophies recorded.');
        }
      });
    }
  });
};
