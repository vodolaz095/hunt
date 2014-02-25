'use strict';

var Sequelize = require('sequelize'),
  url = require('url');

require('colors');

module.exports = exports = function (core) {
  if (core.config.sequelizeUrl) {
    var sequelize = null;
    var parameters = url.parse(core.config.sequelizeUrl);
    if (parameters) {
      switch (parameters.protocol) {
        case 'sqlite:':
          sequelize = new Sequelize(
            parameters.path.split('/')[1],
            (parameters.auth) ? (parameters.auth.split(':')[0]) : null,
            (parameters.auth) ? (parameters.auth.split(':')[1]) : null,
            {
              'dialect': 'sqlite',
              'storage': parameters.hostname
            }
          );
          console.log('ConfigManager: Sequilize'.yellow + ' is trying to use SQLite database...');
          break;
        case 'mysql:':
          sequelize = new Sequelize(
            parameters.path.split('/')[1],
            (parameters.auth) ? (parameters.auth.split(':')[0]) : null,
            (parameters.auth) ? (parameters.auth.split(':')[1]) : null,
            {
              'dialect': 'mysql',
              'host': parameters.hostname,
              'port': parameters.port
            }
          );
          console.log('ConfigManager: Sequilize'.yellow + ' is trying to use MySQL database...');
          break;
        case 'postgres:':
          sequelize = new Sequelize(
            parameters.path.split('/')[1],
            (parameters.auth) ? (parameters.auth.split(':')[0]) : null,
            (parameters.auth) ? (parameters.auth.split(':')[1]) : null,
            {
              'dialect': 'postgres',
              'host': parameters.hostname,
              'port': parameters.port
            }
          );
          console.log('ConfigManager: Sequilize'.yellow + ' is trying to use PostgreSQL database...');
          break;
        default :
          throw new Error('Unable to parse sequelizeUrl with value of ' + core.config.sequelizeUrl + ' - unknown protocol ' + parameters.protocol);
      }

      if (sequelize) {
        sequelize
          .authenticate()
          .complete(function (err) {
            if (err) {
              throw err;
              //core.emit('error', err);
            } else {
/**
 * @name Hunt#Sequilize
 * @description
 * {@link http://sequelizejs.com/ | SQL database object relational mapper constructor}
 */

/**
 * @name Hunt#sequilize
 * @description
 * Sequilize instance with database connection string extracted from config object
 * @see Hunt#Sequilize
 */
              core.Sequelize = Sequelize;
              core.sequelize = sequelize;
              console.log('ConfigManager: Sequilize connection has been established successfully!'.green);
            }
          });
      }
    } else {
      throw new Error('Unable to parse sequelizeUrl with value of ' + core.config.sequelizeUrl);
    }
  }
};
