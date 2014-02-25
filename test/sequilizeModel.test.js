'use strict';
var hunt = require('./../index.js'),
  should = require('should'),
  async = require('async'),
  Hunt;
/*/
describe('Sequilize test for SQLite database model', function () {
  before(function (done) {
    Hunt = hunt({
      'sequelizeUrl':'sqlite://:memory:'
    });

    Hunt.extendModel('Planet', function(core){

      return core.sequelize.define('Planet', {
        name: core.Sequelize.STRING,
      });
    });

    Hunt.on('start', function () {
      Hunt.sequelize.sync().success(function() {
        Hunt.model.Planet.create({
          username: 'Earth'
        }).success(function(planet) {
          done(null);
        });
      });
    });
    Hunt.startBackGround();
  });

  it('populates model with object, that looks like sequilize model', function(){
    Hunt.model.Planet.should.be.equal(1);
  });

  after(function (done) {
    Hunt.stop();
    done();
  });
});
//*/