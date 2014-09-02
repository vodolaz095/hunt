'use strict';

module.exports = exports = function (core) {
  return function (parameters) {
    if (parameters.modelName && core.model[parameters.modelName]) {

      /**
       * @class ExportModelToRestParameters
       * @classdesc
       * Object that hold the configuration parameters needed
       * for exporting {@link model} as {@link http://www.restapitutorial.com/ | REST}
       * interface.
       *
       * @property {string} modelName
       * @property {string} ownerId - name of model field where the creator/owner of the entity is stored
       * @property {Array.<string>} statics - name of {@link http://mongoosejs.com/docs/guide.html#statics | static methods} functions to be exported
       * @property {Array.<string>} methods - name of {@link http://mongoosejs.com/docs/guide.html#methods | instance methods } functions to be exported
       * @property {string} [mountPoint='/api/v1/'+modelName] - mount point of REST interface
       *
       */
      parameters.mountPoint = (parameters.mountPoint || '/api/v1/' + parameters.modelName).toLowerCase();
      parameters.ownerId = parameters.ownerId || 'owner';
      parameters.statics = parameters.statics || [];
      parameters.methods = parameters.methods || [];
      core.extendRoutes(function (core) {
        var router = core.express.Router();
        require('./lib/toRest/listAll.js')(core, parameters, router);
        require('./lib/toRest/create.js')(core, parameters, router);
        require('./lib/toRest/listOne.js')(core, parameters, router);
        require('./lib/toRest/update.js')(core, parameters, router);
        require('./lib/toRest/delete.js')(core, parameters, router);

        require('./lib/toRest/callInstanceMethod.js')(core, parameters, router); //todo - unsecure?
        require('./lib/toRest/callStaticMethod.js')(core, parameters, router); //todo - unsecure?

        router.all('*', function (request, response) {
          response.status(404);
          response.json({
            'status': 'Error',
            'errors': [
              {
                'code': 404,
                'message': 'This API endpoint do not exists!'
              }
            ]
          });
        });

//error reporting
        router.use(function (error, request, response, next) {
//http://mongoosejs.com/docs/validation.html
          if (error.name === 'ValidationError') {
            response.status(400);
            var errs = [];
            for (var x in error.errors) {
              if (error.errors.hasOwnProperty(x)) {
                errs.push({
                  'code': 400,
                  'message': error.errors[x].message,
                  'field': error.errors[x].path,
                  'value': error.errors[x].value
                });
              }
            }
            response.json({
              'status': 'Error',
              'errors': errs
            });
          } else if (error.code === 11000) {
            response.status(400);
            response.json({
              'status': 'Error',
              'errors': [
                {
                  'code': 400,
                  'message': 'Duplicate entry!'
                }
              ]
            });
          } else {
            next(error);
          }
        });

        core.app.use(parameters.mountPoint, router);
      });
    } else {
      throw new Error('HRW: modelName is not defined or not exist!');
    }
  }
};
