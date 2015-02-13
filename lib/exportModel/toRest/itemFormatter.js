'use strict';

var errorResponses = require('./errors.js'),
  assert = require('assert');

function formatDocument(doc, fieldsToShow) {
  if (Array.isArray(fieldsToShow) && fieldsToShow.length > 0) {
    var ret = {};
    fieldsToShow.map(function (getter) {
      ret[getter] = doc.get(getter);
    });
    return ret;
  } else {
    return doc;
  }
}

module.exports = exports = function (itemFound, core, request, response, parameters) {
  assert(typeof itemFound.canRead === 'function',
    'Hunt.exportModelToRest() - hunt.model.' + parameters.modelName + '.methods.canDelete(user, function(error, canRead, fieldsToShow, fieldsToPopulate){...}) is not defined!');

  core.async.parallel({
    'fieldsReadable': function (cb) {
      itemFound.canRead(request.user, function (err, canRead, fieldsToShow, fieldsToPopulate) {
        cb(err, {
          'canRead': !!canRead,
          'fieldsToShow': fieldsToShow || [],
          'fieldsToPopulate': fieldsToPopulate || []
        });
      });
    },
    'fieldsWritable': function (cb) {
      itemFound.canUpdate(request.user, function (err, updateAllowed, arrayOfSetters) {
        cb(err, {
          'canUpdate': !!updateAllowed,
          'arrayOfSetters': arrayOfSetters || []
        });
      });
    },
    'canDelete': function (cb) {
      itemFound.canDelete(request.user, cb);
    }
  }, function (error, obj) {
    if (error) {
      throw error;
    } else {
      if (obj.fieldsReadable.canRead) {
        console.log(obj.fieldsReadable.fieldsToPopulate);
        core.async.each(
          obj.fieldsReadable.fieldsToPopulate,
          function (getter, cb) {
            if (typeof getter === 'string') {
              console.log('populating ' + getter);
              itemFound.populate(getter, cb);
            } else {
              cb(new Error('fieldsToPopulate getter ' + getter + ' is not a string!'));
            }
          }, function (error) {
            if (error) {
              throw error;
            } else {
              var toShow = obj.fieldsReadable.fieldsToShow.concat(obj.fieldsReadable.fieldsToPopulate);
              response.status(200).json({
                'status': 'Ok',
                'code': 200,
                'errors': [],
                'metadata': {
                  'fieldsReadable': toShow,
                  'canWrite': !!obj.fieldsWritable.canUpdate,
                  'fieldsWritable': obj.fieldsWritable.arrayOfSetters,
                  'canDelete': !!obj.canDelete
                },
                'data': formatDocument(itemFound, toShow)
              });
            }
          }
        );
      } else {
        if (request.user) {
          errorResponses.error403(response);
        } else {
          errorResponses.error401(response);
        }
      }
    }
  });
}
;