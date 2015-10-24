'use strict';
/*global angular, async*/
angular.module('huntApp', ['ngRoute', 'angular-hunt'])
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
        .when('/crud/:id', {
          templateUrl: '/partials/crudItem.html',
          controller: 'crudItemController'
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
  .factory('trophy', ['huntModel', function (huntModel) {
    return huntModel('trophy');
  }])

  .controller('mainController', ['$scope', function ($scope) {
    $scope.controller = 'mainController';
  }])
  .controller('clusterController', ['$scope', function ($scope) {
    $scope.controller = 'clusterController';
  }])
  .controller('loginController', ['$scope', function ($scope) {
    $scope.controller = 'loginController';
  }])
  .controller('profileController', ['$scope', function ($scope) {
    $scope.controller = 'profileController';
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
            .error(function () {
              next(new Error('Error getting /time endpoint'));
            });
        }, 1000);
      } else {
        setTimeout(next, 1000);
      }
    }, function (error) {
      throw error;
    });
  }])
  .controller('crudController', ['$scope', 'huntSocketIo', 'trophy', '$http', function ($scope, socket, trophy, $http) {
    $scope.trophies = [];
    $scope.codeSampleForCRUD = 'lalala';
    trophy.query().then(function (trophies) {
      $scope.trophies = trophies;
    });

    $http.get('https://raw.githubusercontent.com/vodolaz095/hunt/master/examples/models/trophy.model.js')
      .success(function (data) {
        $scope.codeSampleForCRUD = data;
      })
      .error(function () {
        throw new Error('Error getting example code for `Trophy` model');
      });

    $scope.createTrophy = function () {
      trophy.create({
        'name': $scope.newTrophyName,
        'priority': $scope.newTrophyPriority
      }).then(function (trophyCreated) {
        $scope.newTrophyName = null;
        $scope.newTrophyScore = null;
        $scope.trophies.push(trophyCreated);
      });
    };
  }])
  .controller('crudItemController', ['$scope', 'trophy', '$routeParams', '$location', function ($scope, trophy, $routeParams, $location) {
    trophy
      .findById($routeParams.id)
      .then(function (item) {
        $scope.item = item;
        item.$watch($scope, 'item');
      }).catch(function () {
        $location.path('/crud');
      });
  }])
  .controller('eventsController', ['$scope', 'huntSocketIo', function ($scope, socket) {
    $scope.recentVisits = [];
    $scope.pingerAnswer = 'Ready to ping!';
    $scope.pingerUrl = 'http://';

    $scope.startPinging = function () {
      $scope.pingerAnswer = 'Starting to ping...';
      socket.emit('pingerUrl', $scope.pingerUrl, function () {
        $scope.pingerAnswer = 'Starting to ping.....';
      });
    };
    socket.on('pingerAnswer', function (value) {
      $scope.pingerAnswer = value;
    });
    $scope.sioMessage = '';
    $scope.sendSioMessage = function () {
      socket.emit('message', $scope.sioMessage, function () {
        $scope.sioMessage = '';
      });
    };
    socket.on('httpSuccess', function (data) {
      if (data.httpSuccess) {
        $scope.recentVisits.push(data.httpSuccess);
      }
    });
  }]);

