'use strict';

var
  int = require('./../interface.js'),
  winston = require('winston'),
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
      sort = request.query.sort,
      itemsPerPage = (request.query.itemsPerPage && parseInt(request.query.itemsPerPage, 10) > 1) ? parseInt(request.query.itemsPerPage, 10) : 10,
      skip = (page - 1) * itemsPerPage,
      limit = itemsPerPage;

    delete filter.sort;
    delete filter.page;
    delete filter.itemsPerPage;

    request.model[parameters.modelName].listFilter(request.user, function (error, filterOverrides) {
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


            int.find(request.model[parameters.modelName], {
              'find': filter,
              'skip': skip,
              'limit': limit,
              'sort': sort
            }, function (error, itemsFound) {
              if (error) {
                cb(error);
              } else {
                core.async.map(itemsFound, function (i, clb) {
                  console.log('itemFound',i);
                  process.nextTick(function () {
                    parameters.exportHelper(request.user, i, clb);
                  });
                }, cb);
              }
            });
          },
          'metadata': function (cb) {
            int.count(request.model[parameters.modelName], {
              'find': filter
            }, function (error, itemsCount) {
              if (error) {
                cb(error);
              } else {
                var metadata = {
                  'modelName': parameters.modelName,
                  'page': page,
                  'itemsPerPage': itemsPerPage,
                  'numberOfPages': Math.floor(1 + itemsCount / itemsPerPage),
                  'count': itemsCount
                };
                if (core.config.env === 'development') {
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


          request.huntEmit(['REST', parameters.modelName, 'QUERY'], {
            'ip': request.ip,
            'ips': request.ips,
            'userAgent': request.headers['user-agent'],

            'user': request.user,

            'modelName': parameters.modelName,
            'filter': filter,
            'count': metadata.count
          });

          winston.info('REST:%s:QUERY', parameters.modelName, {
            'ip': request.ip,
            'ips': request.ips,
            'userAgent': request.headers['user-agent'],

            'userId': request.user ? request.user.id : null,
            'user': request.user ? request.user.toString() : null,
            'userKeychain': request.user ? JSON.stringify(request.user.keychain) : null,

            'modelName': parameters.modelName,
            'filter': JSON.stringify(filter),
            'count': metadata.count
          });


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
