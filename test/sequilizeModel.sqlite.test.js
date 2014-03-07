'use strict';
var hunt = require('./../index.js'),
  should = require('should'),
  async = require('async'),
  Hunt;
//*/
describe('Sequilize test for SQLite database model', function () {
  before(function (done) {
    Hunt = hunt({
      'sequelizeUrl':'sqlite://localhost/'
    });

    Hunt.extendModel('Planet', function(core){
      return core.sequelize.define('Planet', {
        name: core.Sequelize.STRING
      });
    });

    Hunt.on('start', function () {
      Hunt.sequelize.sync().success(function() {
        Hunt.model.Planet.create({
          name: 'Earth'
        }).success(function(planet) {
          done(null);
        });
      });
    });
    Hunt.startBackGround();
  });

  it('populates model with object, that looks like sequilize model', function(){
    Hunt.model.Planet.name.should.be.equal('Planet');
    Hunt.model.Planet.tableName.should.be.equal('Planets');
  });

  it('allows us to find data from it', function(done){
    Hunt.model.Planet
      .find({ where: {name: 'Earth'} })
      .success(function(planet) {
        if(planet){
          planet.name.should.be.equal('Earth');
          done(null);
        } else {
          done(new Error('Error finding planet?'));
        }
      });
  });

  after(function (done) {
    Hunt.stop();
    done();
  });
});
//*/