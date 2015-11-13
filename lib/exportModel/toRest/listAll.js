'use strict';

var
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
    assert(typeof request.model[parameters.modelName].listFilter === 'function',
      'Hunt.exportModelToRest() - hunt.model.' + parameters.modelName + '.statics.listFilter(error, filterOverrides, arrayOfGettersToShow, arrayOfGettersToPopulate){} is not defined!');
    var filter = request.query,
      page = (request.query.page && parseInt(request.query.page, 10) > 0) ? parseInt(request.query.page, 10) : 1,
      sort = request.query.sort || '-_id',
      itemsPerPage = (request.query.itemsPerPage && parseInt(request.query.itemsPerPage, 10) > 1) ? parseInt(request.query.itemsPerPage, 10) : 10,
      skip = (page - 1) * itemsPerPage,
      limit = itemsPerPage;

    delete filter.sort;
    delete filter.page;
    delete filter.itemsPerPage;

    request.model[parameters.modelName].listFilter(request.user, function (error, filterOverrides, arrayOfGettersToShow, arrayOfGettersToPopulate) {
      if (error) {
        throw error;
      }
      var x;
      if (filterOverrides !== false) {
        for (x in filterOverrides) {
          if (filterOverrides.hasOwnProperty(x)) {
            filter[x] = filterOverrides[x];
          }
        }
        core.async.parallel({
          'create': function (cb) {
            request.model[parameters.modelName].canCreate(request.user, function (error, canCreate, fieldsWritable) {
              cb(error, {
                'canCreate': canCreate,
                'fieldsWritable': fieldsWritable
              });
            });
          },
          'data': function (cb) {
            var q = request.model[parameters.modelName]
              .find(filter)
              .skip(skip)
              .limit(limit)
              .sort(sort);

            if (Array.isArray(arrayOfGettersToPopulate) && arrayOfGettersToPopulate.length > 0) {
              q = q.populate(arrayOfGettersToPopulate.map(function (getterName) {
                if (typeof getterName === 'string') {
                  return getterName;
                } else {
                  throw new Error('In arrayOfGettersToPopulate the member ', getterName, ' has wrong syntax!');
                }
              }).join(' '));
            }

            q.exec(function (error, itemsFound) {
              if (error) {
                throw error;
              }
              cb(null, itemsFound.map(function (item) {
                var ret = {};
                if (Array.isArray(arrayOfGettersToShow) && arrayOfGettersToShow.length > 0) {
                  arrayOfGettersToShow.map(function (getterName) {
                    ret[getterName] = item.get(getterName);
                  });
                  if (arrayOfGettersToShow.indexOf('$subscribeToken') !== -1) {
                    ret.$subscribeToken = item.$subscribeToken || parameters.genSub(item);
                  }
                } else {
                  ret = item.toJSON();
                }
                return ret;
              }));
            });
          },
          'metadata': function (cb) {
            request.model[parameters.modelName]
              .count(filter)
              .exec(function (error, itemsCount) {
                if (error) {
                  cb(error);
                } else {
                  var metadata = {
                    'modelName': parameters.modelName,
                    'fieldsReadable': arrayOfGettersToShow,
                    'page': page,
                    'itemsPerPage': itemsPerPage,
                    'numberOfPages': Math.floor(1 + itemsCount / itemsPerPage),
                    'count': itemsCount
                  };
                  if(core.config.env === 'production'){
                    metadata.filter = filter;
                    metadata.sort = sort;
                  }
                  cb(null, metadata);
                }
              });
          }
        }, function (error, retObj) {
          if (error) {
            throw error;
          }
          var metadata = retObj.metadata;
          metadata.canCreate = retObj.create.canCreate;
          metadata.fieldsWritable = retObj.create.fieldsWritable;

          response
            .status(200)
            .json({
              'code': 200,
              'status': 'Ok',
              'metadata': metadata,
              'data': retObj.data
            });
        });
      } else {
        if (request.user) {
          core.errorResponses.error403(response);
        } else {
          core.errorResponses.error401(response);
        }
      }
    });
  });
};
