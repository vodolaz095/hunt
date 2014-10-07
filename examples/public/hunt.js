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
          templateUrl: '/documentation/',
          controller: 'mainController'
        })
        .otherwise({
          redirectTo: '/'
        });
    }])
  .factory('trophy', ['$resource', function ($resource) {
    //https://stackoverflow.com/questions/13269882/angularjs-resource-restful-example
    //https://stackoverflow.com/questions/16387202/angularjs-resource-query-result-array-as-a-property
    return $resource('/api/v1/trophy/:id', {'id': '@id'}, {
      'query': {
        'method': 'GET',
        'transformResponse': function (data) {
          return angular.fromJson(data).data
        },
        'isArray': true
      },
      'get': {
        'method': 'GET',
        'transformResponse': function (data) {
          return angular.fromJson(data).data
        },
        'isArray': false
      },
      'create': { method: 'post' }
    });
  }])
  .factory('socket', function ($rootScope) {
    var socket = io('', {'connect timeout': 1000, 'reconnection':true});
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
        })
      }
    };
  })
  .controller('trophyController', ['$scope', '$http', function ($scope, $http) {
    $scope.update = function () {
      $http.post('/api/v1/trophy', $scope.trophy)//performs the default behaviour for $resource entiry.$save
        .success(function (data, status) {
          //$scope.$apply();
        })
        .error(function (data, status) {
          console.log('error saving');
          //$scope.$apply();
        });
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
      if (data.time) {
        $scope.clock = data.time;
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
                next(new Error('Error hiting /time endpoint'));
              });
          }, 500);
        } else {
          next();
        }
      },
      function (error) {
        throw error
      });

  }])
  .controller('crudController', ['$scope', '$resource', 'socket', 'trophy', function ($scope, $resource, socket, trophy) {
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
    })
  }])

  .controller('eventsController', ['$scope', 'socket', function ($scope, socket) {
    $scope.recentVisits = [];
    $scope.pingerAnswer = "Ready to ping!";
    $scope.pingerUrl = "http://";

    $scope.startPinging = function () {
      $scope.pingerAnswer = "Starting to ping...";
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

