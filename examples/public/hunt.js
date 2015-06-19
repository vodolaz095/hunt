angular.module('huntApp', ['ngRoute', 'ngResource'])
  .config(['$routeProvider',
    function ($routeProvider) {
      $routeProvider
        .when('/events', {
          templateUrl: '/partials/events.html',
          controller: 'eventsController'
        })
        .when('/crud', {
          templateUrl: '/partials/crud.html',
          controller: 'crudController'
        })
        .when('/cache', {
          templateUrl: '/partials/cache.html',
          controller: 'cacheController'
        })
        .when('/cluster', {
          templateUrl: '/partials/cluster.html',
          controller: 'clusterController'
        })
        .when('/login', {
          templateUrl: '/auth/login', // pss! this is server side generated code :-)
          controller: 'loginController'
        })
        .when('/profile', {
          templateUrl: '/profile', // pss! this is server side generated code :-)
          controller: 'profileController'
        })
        .when('/', {
          templateUrl: '/partials/main.html',
          controller: 'mainController'
        })
        .otherwise({
          redirectTo: '/'
        });
    }])
  .factory('huntModel', ['$resource', function ($resource) {
    return function (modelName) {
      //https://stackoverflow.com/questions/13269882/angularjs-resource-restful-example
      //https://stackoverflow.com/questions/16387202/angularjs-resource-query-result-array-as-a-property
      //http://jsfiddle.net/wortzwei/bez79/
      return $resource('/api/v1/' + modelName + '/:id', { 'id': '@id' }, {
        'query': {
          'method': 'GET',
          'transformResponse': function (data) {
            var wrappedResult = angular.fromJson(data);
            wrappedResult.data.$metadata = wrappedResult.metadata;
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
          'isArray': false
        },
        'save': {
          'method': 'PUT',
          'isArray': false
        }
      });
    };
  }])
  .factory('trophy', ['huntModel', function (huntModel) {
    return huntModel('trophy');
  }])
  .factory('socket', function ($rootScope) {
    var socket = io();
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
  })
  .controller('trophyController', ['$scope', function ($scope) {
    $scope.update = function () {
      $scope.trophy.$save();
    };
  }])
  .controller('notificationController', ['$scope', 'socket', function ($scope, socket) {
    $scope.flash = {
      'success': [],
      'info': [],
      'error': []
    };
    $scope.clock = '...';

    socket.on('notify:flash_success', function (data) {
      $scope.flash.success.push(data);
    });
    socket.on('notify:flash_info', function (data) {
      $scope.flash.info.push(data);
    });
    socket.on('notify:flash_error', function (data) {
      $scope.flash.error.push(data);
    });
    socket.on('broadcast', function (data) {
      console.log('broadcast', data);
      if (data.time) {
        $scope.clock = new Date(data.time).toLocaleTimeString();
      }
    });
  }])

  .controller('mainController', ['$scope', function ($scope) {
    //do something? Or not?
  }])
  .controller('clusterController', ['$scope', function ($scope) {
    //do something? Or not?
  }])
  .controller('loginController', ['$scope', function ($scope) {
    //do something? Or not?
  }])
  .controller('profileController', ['$scope', function ($scope) {
    //do something? Or not?
  }])

  .controller('cacheController', ['$scope', '$http', function ($scope, $http) {
    $scope.responses = [];

    async.forever(function (next) {
        if ($scope.responses.length < 10) {
          setTimeout(function () {
            $http.get('/time')
              .success(function (data, status) {
                $scope.responses.push({'data': data, 'status': status});
                next();
              })
              .error(function (data, status) {
                next(new Error('Error getting /time endpoint'));
              });
          }, 1000);
        } else {
          setTimeout(next, 1000);
        }
      },
      function (error) {
        throw error
      });

  }])
  .controller('crudController', ['$scope', 'socket', 'trophy', function ($scope, socket, trophy) {
    $scope.trophies = [];
    trophy.query(function (trophies) {
      $scope.trophies = trophies;
    });

    socket.on('broadcast', function (data) {
      if (data.trophySaved) {
//        console.log('trophySaved',data.trophySaved);
        for (var i = 0; i < $scope.trophies.length; i++) {
//          console.log($scope.trophies[i].id, data.trophySaved.id);
          if ($scope.trophies[i].id == data.trophySaved.id) {
            $scope.trophies[i] = data.trophySaved;
          }
        }
      }
    });
  }])

  .controller('eventsController', ['$scope', 'socket', function ($scope, socket) {
    $scope.recentVisits = [];
    $scope.pingerAnswer = 'Ready to ping!';
    $scope.pingerUrl = 'http://';

    $scope.startPinging = function () {
      $scope.pingerAnswer = 'Starting to ping...';
      socket.emit('pingerUrl', $scope.pingerUrl, function () {
        //event is send!
      });
    };
    socket.on('pingerAnswer', function (value) {
      $scope.pingerAnswer = value;
    });
    $scope.sioMessage = '';
    $scope.sendSioMessage = function () {
      socket.emit('message', $scope.sioMessage, function () {
        //event is send
      });
      $scope.sioMessage = '';
    };
    socket.on('broadcast', function (data) {
      if (data.httpSuccess) {
        $scope.recentVisits.push(data.httpSuccess);
      }
    });
  }])
;

