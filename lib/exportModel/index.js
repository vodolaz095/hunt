module.exports = exports = function (Hunt, parameters) {
  if (parameters.modelName && Hunt.model[parameters.modelName]) {

    parameters.mountPoint = (parameters.mountPoint || '/api/v1/' + parameters.modelName).toLowerCase();
    parameters.ownerId = parameters.ownerId || 'owner';
    parameters.statics = parameters.statics || [];
    parameters.methods = parameters.methods || [];
    Hunt.extendRoutes(function (core) {
      var router = core.express.Router();
      require('./lib/listAll.js')(core, parameters, router);
      require('./lib/create.js')(core, parameters, router);
      require('./lib/listOne.js')(core, parameters, router);
      require('./lib/update.js')(core, parameters, router);
      require('./lib/delete.js')(core, parameters, router);

      require('./lib/callInstanceMethod.js')(core, parameters, router); //todo - unsecure?
      require('./lib/callStaticMethod.js')(core, parameters, router); //todo - unsecure?

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
};
