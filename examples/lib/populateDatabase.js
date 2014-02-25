var async = require('async');

module.exports = exports = function(Hunt){
  //populating the trophies' collection in database
  async.parallel([
    function (cb) {
      Hunt.model.Trophy.findOneAndUpdate({'name': 'Alan Schaefer'}, {scored: false}, {upsert: true}, cb);
    },
    function (cb) {
      Hunt.model.Trophy.findOneAndUpdate({'name': 'George Dillon'}, {scored: true}, {upsert: true}, cb);
    },
    function (cb) {
      Hunt.model.Trophy.findOneAndUpdate({'name': 'Rick Hawkins'}, {scored: true}, {upsert: true}, cb);
    },
    function (cb) {
      Hunt.model.Trophy.findOneAndUpdate({'name': 'Blain Cooper'}, {scored: true}, {upsert: true}, cb);
    },
    function (cb) {
      Hunt.model.Trophy.findOneAndUpdate({'name': 'Billy Sole'}, {scored: true}, {upsert: true}, cb);
    },
    function (cb) {
      Hunt.model.Trophy.findOneAndUpdate({'name': 'Mac Eliot'}, {scored: true}, {upsert: true}, cb);
    },
    function (cb) {
      Hunt.model.Trophy.findOneAndUpdate({'name': 'Anna Goncalves'}, {scored: false}, {upsert: true}, cb);
    }
  ], function (err, trophies) {
    if (err) {
      console.error(err);
    } else {
      console.log('' + trophies.length + ' trophies recorded.');
    }
  });
}
