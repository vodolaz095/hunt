'use strict';
var
  hunt = require('./../index.js'),
  PlanetModel = require('./../examples/models/planet.model.js'),
  Hunt;

require('should');

describe('Sequilize test for SQLite database model', function () {
  this.timeout(10000);

  before(function (done) {
    Hunt = hunt({
      'enableSequilize':true,
      'sequelizeUrl':'sqlite://localhost/'
    });

    Hunt.extendModel('Planet',PlanetModel);

    Hunt.on('start', function () {
      require('./../examples/lib/populatePlanet.js')(Hunt,done);
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
      .then(function(planet) {
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