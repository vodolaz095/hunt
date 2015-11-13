'use strict';

/**
 * @method ExportModelToRestParameters#canRead
 * @param {User} User
 * @param {function} callback - function(error, canRead, fieldsToShow, fieldsToPopulate){...}
 * @description
 * Model static method, that is called to determine, does the current authenticated user have rights to read fields of
 * this particular entity, and what fields are readable.
 * @example
 * //ACL check for readable fields in this current document
 * TrophySchema.methods.canRead = function (user, callback) {
 *   if(user) {
 *     if(user.roles.gameMaster) {
 *       callback(null, true, ['id','name','scored','priority','owner'],['owner']);
 *     } else {
 *       callback(null, true, ['id','name','scored','priority']);
 *     }
 *   } else {
 *       callback(null, false);
 *   }
 * };
 */

module.exports = exports = function (core, parameters, router) {
  router.get(/^\/([0-9a-fA-F]{24})$/, core.preload(parameters.modelName), function (request, response) {
    var
      obj = request.preload;

    function formatDocument(doc, fieldsToShow) {
      if (Array.isArray(fieldsToShow) && fieldsToShow.length > 0) {
        var ret = {};
        fieldsToShow.map(function (getter) {
          ret[getter] = doc.get(getter);
        });
        ret.$subscribeToken = parameters.genSub(doc);
        if (fieldsToShow.indexOf('$subscribeToken') !== -1) {
          doc.$subscribeToken = doc.$subscribeToken || parameters.genSub(doc);
        }
        return ret;
      }
      return doc;
    }

    response.status(200).json({
      'status': 'Ok',
      'code': 200,
      'metadata': {
        'modelName': parameters.modelName,
        'canRead': !!obj.canRead,
        'fieldsReadable': obj.fieldsReadable,
        'canWrite': !!obj.canWrite,
        'fieldsWritable': obj.fieldsWritable,
        'canDelete': !!obj.canDelete
      },
      'data': formatDocument(request.preload.model, obj.fieldsReadable)
    });
  });
};