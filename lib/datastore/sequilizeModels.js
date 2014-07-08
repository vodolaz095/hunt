'use strict';

var Sequelize = require('sequelize'),
  url = require('url');

require('colors');

module.exports = exports = function (core) {
  if (core.config.sequelizeUrl) {

    /**
     * @name Hunt#Sequilize
     * @description
     * {@link http://sequelizejs.com/ | SQL database object relational mapper constructor},
     * that is used only when config option of sequilizeUrl is defined.
     * @see config
     *
     */
    core.Sequelize = Sequelize;
    var parameters = url.parse(core.config.sequelizeUrl);

    if (parameters) {
      switch (parameters.protocol) {
        case 'sqlite:':
          /*
           * @name Hunt#sequilize
           * @description
           * Sequilize instance with database connection string extracted from config object
           * @see Hunt#Sequilize
           */
          var sequelize = new core.Sequelize(
            'databaseThatIsTotalyIgnored',
            'usernameThatNobodyCaresAbout',
            'passwordThatNobodyNeeds',
            {
              'dialect': 'sqlite',
              'storage': (parameters.path !== '/') ? parameters.path : ':memory:'
            }
          );
          console.log('ConfigManager: Sequilize'.yellow + ' is trying to use SQLite database...');
          break;
        case 'mysql:':
          var sequelize = new core.Sequelize(
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
          var sequelize = new core.Sequelize(
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

      core.sequelize = sequelize;
    } else {
      throw new Error('Unable to parse sequelizeUrl with value of ' + core.config.sequelizeUrl);
    }
  }
};
