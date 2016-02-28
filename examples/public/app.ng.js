(function () {
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
          .when('/trophy', {
            templateUrl: '/partials/trophy.html',
            controller: 'trophyController'
          })
          .when('/trophy/:id', {
            templateUrl: '/partials/trophyItem.html',
            controller: 'trophyItemController'
          })
          .when('/planet', {
            templateUrl: '/partials/planet.html',
            controller: 'planetController'
          })
          .when('/planet/:id', {
            templateUrl: '/partials/planetItem.html',
            controller: 'planetItemController'
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
          .when('/inbox', {
            templateUrl: '/partials/inbox.html',
            controller: 'inboxController'
          })
          .when('/dialog/:id', {
            templateUrl: '/partials/dialog.html',
            controller: 'dialogController'
          })
          .when('/', {
            templateUrl: '/?noLayout=true',
            controller: 'mainController'
          })
          .otherwise({
            redirectTo: '/'
          });
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


    /*
     * CRUD example to edit trphy model
     */
    //DI model for CRUD example
    .factory('trophy', ['huntModel', function (huntModel) {
      return huntModel('trophy');
    }])
    //Controller for Trophies CRUD example
    .controller('trophyController', ['$scope', 'huntSocketIo', 'trophy', '$http', function ($scope, socket, trophy, $http) {
      $scope.trophies = [];
      $scope.codeSampleForCRUD = 'lalala';
      trophy.query({'sort': 'name'}).then(function (trophies) {
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
    .controller('trophyItemController', ['$scope', 'trophy', '$routeParams', '$location', function ($scope, trophy, $routeParams, $location) {
      trophy
        .findById($routeParams.id)
        .then(function (item) {
          $scope.item = item;
          item.$watch($scope, 'item');
        }).catch(function () {
        $location.path('/crud');
      });
    }])

    .factory('planet', ['huntModel', function (huntModel) {
      return huntModel('planet');
    }])
    //Controller for Planets CRUD example
    .controller('planetController', ['$scope', 'planet', '$http', function ($scope, planet, $http) {
      $scope.trophies = [];
      $scope.codeSampleForCRUD = 'lalala';
      planet.query({'sort': 'name'}).then(function (trophies) {
        $scope.trophies = trophies;
      });

      //$http.get('https://raw.githubusercontent.com/vodolaz095/hunt/master/examples/models/planet.model.js')
      //  .success(function (data) {
      //    $scope.codeSampleForCRUD = data;
      //  })
      //  .error(function () {
      //    throw new Error('Error getting example code for `Trophy` model');
      //  });

      $scope.createTrophy = function () {
        planet.create({
          'name': $scope.newTrophyName,
          'priority': $scope.newTrophyPriority
        }).then(function (trophyCreated) {
          $scope.newTrophyName = null;
          $scope.newTrophyScore = null;
          $scope.trophies.push(trophyCreated);
        });
      };
    }])
    .controller('planetItemController', ['$scope', 'planet', '$routeParams', '$location', function ($scope, planet, $routeParams, $location) {
      planet
        .findById($routeParams.id)
        .then(function (item) {
          $scope.item = item;
          item.$watch($scope, 'item');
        }).catch(function () {
        $location.path('/crud');
      });
    }])


    /*
     * Example to show socket.io events
     */
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
    }])

    /*
     *  Private Messages example
     */
    .controller('inboxController', ['$scope', 'huntSocketIo', 'huntUser', 'huntMyself', '$location', function ($scope, huntSocketIo, User, myself, $location) {
      $scope.page = 1;

      $scope.users = User.find()
        .then(function (usersFound) {
          $scope.users = usersFound;
        });

      myself()
        .then(function (i) {
          return i.inbox($scope.page, 100);
        }, function (error) {
          console.error(error);
          $location.path('/login');
        })
        .then(function (messages) {
          $scope.messages = messages;
        });

    }])
    .controller('dialogController', [
      '$scope', 'huntSocketIo', 'huntUser', 'huntMyself', '$routeParams', '$location', '$route', '$q',
      function ($scope, huntSocketIo, User, myself, $routeParams, $location, $route, $q) {
        $scope.page = 1;
        $scope.messages = [];

//Process socket.io notifications
        function processNewMessage(data) {
          $scope.messages.push(data.message);
        }

        $q.all([
          myself().then(function (i) {
            return i.getDialog($routeParams.id, $scope.page, 100);
          }).then(function (messages) {
            $scope.messages = messages;
          }),
          User.findById($routeParams.id)
            .then(function (to) {
              $scope.to = to;
              $scope.sendMessage = function (message) {
                return to.sendMessage(message)
                  .then(function () {
                    $scope.message = '';
                  });
              };
            })
        ]).then(function () {
          huntSocketIo.on('notify:pm:in', processNewMessage);
          huntSocketIo.on('notify:pm:out', processNewMessage);
        }, function (error) {
          console.log(error);
          $location.path('/login');
        });
      }]);
})();