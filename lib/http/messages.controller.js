'use strict';

module.exports = exports = function (core, router) {

  router.get('/dialog/:with', function (request, response) {
    if(!request.user){
      return core.errorResponses.unauthorized(response);
    }

    var
      page = (request.query.page && parseInt(request.query.page, 10) > 0) ? parseInt(request.query.page, 10) : 1,
      itemsPerPage = (request.query.itemsPerPage && parseInt(request.query.itemsPerPage, 10) > 1) ? parseInt(request.query.itemsPerPage, 10) : 100,
      skip = (page - 1) * itemsPerPage;

    request.user.getDialog(request.params.id, itemsPerPage, skip, function (err, messages, itemsCount) {
      if (err) {
        if (err.message === 'User do not exists!') {
          return core.errorResponses.error404(response, 'User do not exists!');
        }
        throw err;
      }
      response
        .status(200)
        .json({
          'status': 'Ok',
          'code': 200,
          'metadata': {
            'modelName': 'Message',
            'fieldsReadable': [
              '_id',
              'id',
              'to',
              'from',
              'new',
              'message',
              'isMine',
              'updatedAt',
              'createdAt',
              'ago'
            ],
            'page': page,
            'itemsPerPage': itemsPerPage,
            'numberOfPages': Math.floor(1 + itemsCount / itemsPerPage),
            'count': itemsCount
          },
          'data': messages.map(function (m) {
            return {
              '_id': m._id,
              'id': m.id,
              'to': m.to,
              'from': m.from,
              'new': m.new,
              'message': m.message,
              'isMine': m.from._id.equals(request.user._id),
              'updatedAt': m.updatedAt,
              'createdAt': m.createdAt,
              'ago': m.ago
            };
          })
        });
    });
  });

  router.all(/^\/([0-9a-fA-F]{24})\/dismiss$/, core.preload('Message'), function (request, response) {
    if (request.method !== 'GET') {
      request.preload.model.dismiss(request.user, function (error) {
        if (error) {
          if (error.message === 'NOT_YOUR_MESSAGE') {
            return core.errorResponses.forbidden(response);
          }
          throw error;
        }
        response.status(200)
          .json({
            'code': 200,
            'status': 'Dismissed'
          });
      });
    } else {
      return core.errorResponses.notImplemented(response);
    }
  });
};