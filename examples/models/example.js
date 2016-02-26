var hunt = require('hunt'),
  huntSequilize = require('./index.js'),
  Hunt = hunt({
    'sequelizeUrl': 'sqlite://localhost/' //create database in memory
  });

huntSequilize(Hunt);

Hunt.extendModel('Planet', function (core) {
  return core.sequelize.define('Planet', {
    name: core.Sequelize.STRING
  });
});

Hunt.on('start', function () {
  Hunt.sequelize.sync().success(function () {

    Hunt.model.Planet.create({
      name: 'Earth'
    }).success(function (planet) {
      console.log('Planet "'+planet.name+'" is recorded to database');
      Hunt.model.Planet
        .find({ where: {name: 'Earth'} })
        .success(function (planetFound) {
          console.log('Planet "'+planetFound.name+'" is found to database');
          Hunt.stop();
        });
    });
  });
});
Hunt.startBackGround();
