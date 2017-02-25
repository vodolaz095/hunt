'use strict';

module.exports = exports = function (core) {
  var PlanetSchema = core.sequelize.define('Planet', {
      name: core.Sequelize.STRING,
      author: core.Sequelize.STRING,
      huntingAllowed: core.Sequelize.BOOLEAN
    },
    {
      'classMethods': {
        canCreate: function (user, callback) {
          callback(null, false);
        },
        listFilter: function (user, callback) {
          callback(null, {});
        }
      },
      'instanceMethods': {
        canRead: function (user, callback) {
          callback(null, true, ['id', 'name', 'huntingAllowed', '$subscribeToken', 'createdAt', 'updatedAt']);
        },
        canUpdate: function (user, callback) {
          callback(null, !!user, ['name', 'huntingAllowed']);
        },
        canDelete: function (user, callback) {
          callback(null, false);
        }
      }
    }
  );
  return PlanetSchema;
};