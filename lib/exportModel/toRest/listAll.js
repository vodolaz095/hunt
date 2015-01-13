'use strict';

var errorResponses = require('./errors.js'),
  assert = require('assert');

/**
 * @method ExportModelToRestParameters.listFilter
 * @param {User} User
 * @param {function} callback - function(error, filter, arrayOfNamesOfInstanceFieldsToShow, arrayOfNamesOfInstanceFieldsToPopulate){...}
 * @description
 * Model static method, that is called to determine, does the current authenticated user have rights to read fields of
 * this particular entity, and what fields are readable.
 * The filter object is passed to model query builder.
 * @example
 * TrophySchema.statics.listFilter = function (user, callback) {
 *   if(user) {
 *     if(user.roles.gameMaster) {
 *       callback(null, {}, ['id','name','scored','priority','owner'],['owner']);
 *     } else {
 *       callback(null, {'owner':user.id}, ['id','name','scored','priority']);
 *     }
 *   } else {
 *       callback(null, false);
 *   }
 * };
 */

module.exports = exports = function (core, parameters, router) {
  router.get('/', function (request, response) {
//*/
    assert(typeof request.model[parameters.modelName].listFilter === 'function',
        'Hunt.exportModelToRest() - hunt.model.' + parameters.modelName + '.statics.listFilter(error, filterOverrides, arrayOfGettersToShow, arrayOfGettersToPopulate){} is not defined!');
//*/
    var filter = request.query,
      page = (request.query.page && parseInt(request.query.page) > 0) ? parseInt(request.query.page) : 1,
      sort = request.query.sort || '-_id',
      itemsPerPage = (request.query.itemsPerPage && parseInt(request.query.itemsPerPage) > 1) ? parseInt(request.query.itemsPerPage) : 10,
      skip = (page - 1) * itemsPerPage,
      limit = itemsPerPage;

    delete filter.sort;
    delete filter.page;
    delete filter.itemsPerPage;

    request.model[parameters.modelName].listFilter(request.user, function (error, filterOverrides, arrayOfGettersToShow, arrayOfGettersToPopulate) {
      if (error) {
        throw error;
      } else {
        if (filterOverrides !== false) {
          for (var x in filterOverrides) {
            if (filterOverrides.hasOwnProperty(x)) {
              filter[x] = filterOverrides[x];
            }
          }
          core.async.parallel({
            'status': function (cb) {
              cb(null, 'Ok'); //todo - stupid?
            },
            'data': function (cb) {
              var q =
                request.model[parameters.modelName]
                  .find(filter)
                  .skip(skip)
                  .limit(limit)
                  .sort(sort);

              if (Array.isArray(arrayOfGettersToPopulate) && arrayOfGettersToPopulate.length > 0) {
                arrayOfGettersToPopulate.map(function (getterName) {
                  if (typeof getterName === 'string') {
                    q = q.populate(getterName);
                  } else {
                    throw new Error('In arrayOfGettersToPopulate the member ', getterName, 'has wrong syntax!');
                  }
                });
              }

              q.exec(function (error, itemsFound) {
                if (error) {
                  throw error;
                } else {
                  cb(null, itemsFound.map(function (item) {
                    var ret = {};
                    if (Array.isArray(arrayOfGettersToShow) && arrayOfGettersToShow.length > 0) {
                      arrayOfGettersToShow.map(function (getterName) {
                        ret[getterName] = item.get(getterName);
                      });
                    } else {
                      ret = item;
                    }
                    return ret;
                  }));
                }
              });
            },
            'metadata': function (cb) {
              request.model[parameters.modelName]
                .count(filter)
                .exec(function (error, itemsCount) {
                  if (error) {
                    cb(error);
                  } else {
                    cb(null, {
                      'modelName': parameters.modelName,
                      'fieldsAccessible': arrayOfGettersToShow,
                      'filter': filter,
                      'page': page,
                      'sort': sort,
                      'itemsPerPage': itemsPerPage,
                      'numberOfPages': Math.floor(1 + itemsCount / itemsPerPage),
                      'count': itemsCount
                    });
                  }
                });
            }
          }, function (error, retObj) {
            if (error) {
              throw error;
            } else {
              response.status(200);
              response.json(retObj);
            }
          });
        } else {
          if (request.user) {
            errorResponses.error403(response);
          } else {
            errorResponses.error401(response);
          }
        }
      }
    });
  });
};
