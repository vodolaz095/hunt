'use strict';

var
  errorResponses = require('./errors.js');

module.exports = exports = function (core) {
  /**
   * @method Hunt#preload
   * @param {string} modelName
   * @returns function(request,response,next){}
   * @description
   * Middleware to load Mongoose model with id extracted from {@link request}.params[0]
   * into {@link request}.preload
   * @see request#preload
   * @example
   *
   * hunt.extendRouter('/api/v1/trophy', function(core, router){
   *  router.get(/^\/([0-9a-fA-F]{24})\/isScored$/, core.preload('Trophy'), function(request, response){
   *    if(request.preload.canRead) {
   *      response.json({'scored':request.preload.model.scored});
   *    } else {
   *      response.sendStatus(403);
   *    }
   *  });
   * });
   *
   */

  return function (modelName) {
    if (modelName && core.model[modelName]) {
      return function (request, response, next) {
        request.model[modelName].findById(request.params[0])
          .exec(function (error, itemFound) {
            if (error) {
              throw error;
            }

            if (itemFound) {
              core.async.parallel({
                'fieldsReadable': function (cb) {
                  process.nextTick(function () {
                    if (typeof itemFound.canRead === 'function') {
                      itemFound.canRead(request.user, function (err, canRead, fieldsToShow, fieldsToPopulate) {
                        cb(err, {
                          'canRead': !!canRead,
                          'fieldsToShow': fieldsToShow || [],
                          'fieldsToPopulate': fieldsToPopulate || []
                        });
                      });
                    } else {
                      cb(new Error('Hunt.exportModelToRest() - hunt.model.' + modelName + '.methods.canRead(user, function(error, canReadBool, arrayOfFieldsToShow, arrayOfFieldsToPopulate){...}) is not defined!'));
                    }
                  });
                },
                'fieldsWritable': function (cb) {
                  process.nextTick(function () {
                    if (typeof itemFound.canUpdate === 'function') {
                      itemFound.canUpdate(request.user, function (err, updateAllowed, arrayOfSetters) {
                        cb(err, {
                          'canUpdate': !!updateAllowed,
                          'arrayOfSetters': arrayOfSetters || []
                        });
                      });
                    } else {
                      cb(new Error('Hunt.exportModelToRest() - hunt.model.' + modelName + '.methods.canUpdate(user, function(error, canUpdateBool, arrayOfSetters){...}) is not defined!'));
                    }
                  });
                },
                'canDelete': function (cb) {
                  process.nextTick(function () {
                    if (typeof itemFound.canDelete === 'function') {
                      itemFound.canDelete(request.user, cb);
                    } else {
                      cb(new Error('Hunt.exportModelToRest() - hunt.model.' + modelName + '.methods.canDelete(user, function(error, canDeleteBool) is not defined!'));
                    }
                  });
                }
              }, function (error, obj) {
                if (error) {
                  throw error;
                }
                if (obj.fieldsReadable.canRead) {
//                  console.log(obj.fieldsReadable.fieldsToPopulate);
                  core.async.each(
                    obj.fieldsReadable.fieldsToPopulate,
                    function (getter, cb) {
                      if (typeof getter === 'string') {
//                        console.log('populating ' + getter);
                        itemFound.populate(getter, cb);
                      } else {
                        cb(new Error('fieldsToPopulate getter ' + getter + ' is not a string!'));
                      }
                    },
                    function (error) {
                      if (error) {
                        throw error;
                      }
                      /**
                       * @class Preload
                       * @classdesc
                       * Object, populated by using the {@link Hunt#preload} middleware, with data accessible via {@link request}.preload
                       * @property {string} modelName
                       * @property {Object} model
                       * @property {Array.<string>} fieldsReadable
                       * @property {Array.<string>} fieldsWritable
                       * @property {Boolean} canRead
                       * @property {Boolean} canWrite
                       * @property {Boolean} canDelete
                       */
                      request.preload = {
                        'modelName': modelName,
                        'model': itemFound,
                        'canRead': obj.fieldsReadable.canRead,
                        'fieldsReadable': obj.fieldsReadable.fieldsToShow.concat(obj.fieldsReadable.fieldsToPopulate),
                        'canWrite': obj.fieldsWritable.canUpdate,
                        'fieldsWritable': obj.fieldsWritable.arrayOfSetters,
                        'canDelete': obj.canDelete
                      };
                      next();
                    }
                  );
                } else {
                  if (request.user) {
                    errorResponses.error403(response);
                  } else {
                    errorResponses.error401(response);
                  }
                }
              });
            } else {
              errorResponses.error404(response);
            }
          });
      };
    }
    return function (request, response, next) {
      return next(new Error('Hunt.exportModelToRest() - modelName is not defined or corresponding model (' + modelName + ') does not exist!'));
    };
  };
};