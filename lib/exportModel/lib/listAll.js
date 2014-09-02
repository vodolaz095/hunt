var errorResponses = require('./errors.js');

module.exports = exports = function (core, parameters, router) {
  router.get('/', function (request, response) {

    var filter = request.query,
      page = (request.query.page && request.query.page > 0) || 1,
      sort = request.query.sort || '-_id',
      itemsPerPage = (request.query.itemsPerPage && request.query.itemsPerPage > 0) || 10,
      skip = (page - 1) * itemsPerPage,
      limit = itemsPerPage;

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
                      'page': page,
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
