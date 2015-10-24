'use strict';
/*global angular, io, window, $, async*/

var huntErrors = [];
angular
  .module('angular-hunt', ['ngResource'])
  .factory('huntSocketIo', ['$rootScope', function ($rootScope) {
    var socket = io();
    $(window).on('beforeunload', function () {
      socket.close(); //https://bugzilla.mozilla.org/show_bug.cgi?id=712329
    });
    return {
      on: function (eventName, callback) {
        socket.on(eventName, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            callback.apply(socket, args);
          });
        });
      },
      emit: function (eventName, data, callback) {
        socket.emit(eventName, data, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            if (callback) {
              callback.apply(socket, args);
            }
          });
        });
      }
    };
  }])
  .factory('huntModel2', ['$http', 'huntSocketIo', function ($http, huntSocketIo) {
    return function (modelName, prefix) {
      prefix = prefix || '/api/v1/';

      function encodeQueryData(data) {
        data = data || {};
        var
          d,
          ret = [];
        for (d in data) {
          if (data.hasOwnProperty(d)) {
            ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(data[d]));
          }
        }
        return ret.join('&');
      }


      function Model() {
      }
      Model.prototype.$subscribe = function () {
        var t = this;
        if (t.$subscribeToken) {
          huntSocketIo.on(t.$subscribeToken.toString(), function (data) {
            if (data.delete === 'delete') {
              t.$deleted = true;
            }
            if (data.patch) {
              Object.keys(data.patch).map(function (p) {
                t[p] = data.patch[p].new;
              });
            }
          });
        }
        return t;
      };
      Model.find = function (parameters, callback) {
        return $http.get(prefix + modelName + '?' + encodeQueryData(parameters))
          .then(function (response) {
            switch (response.status) {
            case 200:
              var ret = response.data.data.map(function (m) {
                var a = new Model();
                Object.keys(m).map(function (k) {
                  if (m.hasOwnProperty(k)) {
                    a[k] = m[k];
                  }
                });
                return a.$subscribe();
              });
              ret.$code = 200;
              ret.$status = response.data.status;
              ret.$metadata = response.data.metadata;
              if (typeof callback === 'function') {
                callback(ret);
              }
              return ret;
            default:
              throw new Error('HuntModel:' + response.status + ':' + response.data.message);
            }
          });
      };
      Model.query = Model.find;

      Model.findById = function (id, callback) {
        return $http.get(prefix + modelName + '/' + id)
          .then(function (response) {
            switch (response.status) {
            case 200:
              var ret = new Model();
              ret.$code = 200;
              ret.$status = response.data.status;
              ret.$metadata = response.data.metadata;
              Object.keys(response.data.data).map(function (k) {
                if (response.data.data.hasOwnProperty(k)) {
                  ret[k] = response.data.data[k];
                }
              });
              ret.$subscribe();
              if (typeof callback === 'function') {
                callback(ret);
              }
              return ret;
            default:
              throw new Error('HuntModel:' + response.status + ':' + response.data.message);
            }
          });
      };
      Model.create = function (parameters, callback) {
        var t = this;
        return $http.post(prefix + modelName, parameters).then(function (response) {
          if (response.status === 201) {
            return t.findById(response.data.id, callback);
          } else {
            throw new Error('HuntModel:' + response.status + ':' + response.data.message);
          }
        });
      };

      Model.findOne = function (parameters, callback) {
        return $http.get(prefix + modelName + '?' + encodeQueryData(parameters))
          .then(function (response) {
            switch (response.status) {
            case 200:
              var ret;
              if (response.data.data && response.data.data[0]) {
                ret = new Model();
                ret.$code = 200;
                ret.$status = response.data.status;
                ret.$metadata = response.data.metadata;
                Object.keys(response.data.data[0]).map(function (k) {
                  if (response.data.data.hasOwnProperty(k)) {
                    ret[k] = response.data.data[k];
                  }
                });
                ret.$subscribe();
                if (typeof callback === 'function') {
                  callback(ret);
                }
                return ret;
              } else {
                ret = {};
                ret.$code = 200;
                ret.$status = response.data.status;
                ret.$metadata = response.data.metadata;
                return ret;
              }
              break;
            default:
              throw new Error('HuntModel:' + response.status + ':' + response.data.message);
            }
          });
      };
      Model.get = Model.findOne;


      Model.prototype.$save = function () {
        return $http.patch(prefix + modelName + '/' + this.id, this)
          .then(function (response) {
            if (response.status !== 200) {
              throw new Error('HuntModel:' + response.status + ':' + response.data.message);
            }
          });
      };
      Model.prototype.$remove = function () {
        return $http.delete(prefix + modelName, {})
          .then(function (response) {
            if (response.status !== 200) {
              throw new Error('HuntModel:' + response.status + ':' + response.data.message);
            }
          });
      };

      Model.prototype.$watch = function (n, o) {
        console.log(n, o);
      };
      return Model;
    };
  }])
  .factory('huntModel', ['$resource', function ($resource) {
    return function (modelName) {
      //https://stackoverflow.com/questions/13269882/angularjs-resource-restful-example
      //https://stackoverflow.com/questions/16387202/angularjs-resource-query-result-array-as-a-property
      //http://jsfiddle.net/wortzwei/bez79/
      return $resource('/api/v1/' + modelName + '/:id', {'id': '@id'}, {
        'query': {
          'method': 'GET',
          'transformResponse': function (data) {
            var wrappedResult = angular.fromJson(data);
            wrappedResult.data.$metadata = wrappedResult.metadata || {};
            return wrappedResult.data;
          },
          'isArray': true,
          'interceptor': {
            response: function (response) {
              response.resource.$metadata = response.data.$metadata;
              return response.resource;
            }
          }
        },
        'get': {
          'method': 'GET',
          'transformResponse': function (data) {
            var wrappedResult = angular.fromJson(data);
            if (typeof(wrappedResult.data) === 'undefined') {
              wrappedResult.data = {};
            }
            wrappedResult.data.$metadata = wrappedResult.metadata;
            return wrappedResult.data;
          },
          'interceptor': {
            response: function (response) {
              response.resource.$metadata = response.data.$metadata;
              return response.resource;
            }
          },
          'isArray': false
        },
        'create': {
          'method': 'POST',
          'transformResponse': function (data) {
            return angular.fromJson(data).data;
          },
          'isArray': false
        },
        'save': {
          'method': 'PATCH',
          'transformResponse': function (data) {
            return angular.fromJson(data).data;
          },
          'isArray': false
        },
        'delete': { //http://stackoverflow.com/questions/16167463/angular-js-delete-resource-with-parameter
          'method': 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          params: {id: '@id'}
        }
      });
    };
  }])
  .controller('notificationController', ['$scope', 'huntSocketIo', function ($scope, socket) {
    var le;
    $scope.flash = {
      'success': [],
      'info': [],
      'error': []
    };
    $scope.clock = '';
    setInterval(function () {
      le = huntErrors.pop();
      if (le !== undefined) {
        $scope.flash.error.push(le);
      }
    }, 100);

    socket.on('notify:flash_success', function (data) {
      $scope.flash.success.push(data);
    });
    socket.on('notify:flash_info', function (data) {
      $scope.flash.info.push(data);
    });
    socket.on('notify:flash_error', function (data) {
      $scope.flash.error.push(data);
    });
    socket.on('currentTime', function (data) {
      if (data.time) {
        $scope.clock = new Date(data.time).toLocaleTimeString();
      }
    });
  }])
  .
  factory('$exceptionHandler', function () {
    return function errorCatcherHandler(exception, cause) {
      //console.error('stack', exception.stack);
      console.log(cause + ':' + exception.message);
      //$rootScope.addError(exception.message);
      huntErrors.push(exception.message);

    };
  })
  //.config(function ($provide) {
  //  $provide.decorator('$exceptionHandler', function ($delegate, $injector) {
  //    return function (exception, cause) {
  //      var $rootScope = $injector.get('$rootScope');
  //      $rootScope.addError({message: 'Exception', 'reason': exception, 'cause': cause});
  //      console.log('Exception', exception, 'cause', cause);
  //      $delegate(exception, cause);
  //    };
  //  });
  //})
;
