'use strict';
/*global angular, io, window, $*/

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
  .directive('stringToNumber', function () { //https://docs.angularjs.org/error/ngModel/numfmt?p0=10
    return {
      require: 'ngModel',
      link: function (scope, element, attrs, ngModel) {
        ngModel.$parsers.push(function (value) {
          return '' + value;
        });
        ngModel.$formatters.push(function (value) {
          return parseFloat(value, 10);
        });
      }
    };
  })
  .factory('huntModel', ['$http', 'huntSocketIo', function ($http, huntSocketIo) {
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

      /**
       * @class AngularHuntModel
       * @constructor
       */
      function Model() {
        this.$saving = false;
        this.$subscribed = false;
        this.$validationErrors = [];
      }

      /**
       * @name AngularHuntModel.find
       * @param {object} parameters - query parameters to be used
       * @param {function} callback - optional callback(groupOfObjectsFound)
       * @description
       * Find group of entities filtered by query dictionary
       * Returns promise resolved with this object group.
       * Optionally calls a callback
       * @see AngularHuntModel.query
       * @returns {Promise}
       */
      Model.find = function (parameters, callback) {
        return $http.get(prefix + modelName + '?' + encodeQueryData(parameters))
          .then(function (response) {
            if (response.status !== 200) {
              throw new Error('HuntModel:' + response.status + ':' + response.data.message);
            }

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
          });
      };
      /**
       * @name AngularHuntModel.query
       * @param {object} parameters - query parameters to be used
       * @param {function} callback - optional callback(groupOfObjectsFound)
       * @description
       * Find group of entities filtered by query dictionary
       * Returns promise resolved with this object group.
       * Optionally calls a callback
       * @see AngularHuntModel.find
       * @returns {Promise}
       */
      Model.query = Model.find;

      /**
       * @name AngularHuntModel.findById
       * @param {string} id - server side generated object uid
       * @param {function} callback - optional callback
       * @description
       * Find entity with this id
       * Returns promise resolved with this object.
       * Optionally calls a callback
       * @see AngularHuntModel.find
       * @returns {Promise}
       */
      Model.findById = function (id, callback) {
        return $http.get(prefix + modelName + '/' + id)
          .then(function (response) {
            if (response.status !== 200) {
              throw new Error('HuntModel:' + response.status + ':' + response.data.message);
            }
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
          });
      };

      /**
       * @name AngularHuntModel.create
       * @param {obj} parameters - dictionary of setters of object to be created
       * @param {function} callback - optional callback(object)
       * @description
       * Tries to create object with parameters.
       * Returns promise resolved with this object.
       * Optionally calls a callback
       * @see AngularHuntModel.create
       * @returns {Promise}
       */

      Model.create = function (parameters, callback) {
        var t = this;
        return $http.post(prefix + modelName, parameters).then(function (response) {
          if (response.status !== 201) {
            throw new Error('HuntModel:' + response.status + ':' + response.data.message);
          }
          return t.findById(response.data.id, callback);
        });
      };

      /**
       * @name AngularHuntModel.findOne
       * @param {object} parameters - query parameters to be used
       * @param {function} callback - optional callback(objectFound)
       * @description
       * Find first one of group of entities filtered by query dictionary
       * Returns promise resolved with this object.
       * Optionally calls a callback
       * @see AngularHuntModel.get
       * @returns {Promise}
       */

      Model.findOne = function (parameters, callback) {
        return $http.get(prefix + modelName + '?' + encodeQueryData(parameters))
          .then(function (response) {
            if (response.status === 201) {
              throw new Error('HuntModel:' + response.status + ':' + response.data.message);
            }
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
          });
      };
      /**
       * @name AngularHuntModel.get
       * @param {object} parameters - query parameters to be used
       * @param {function} callback - optional callback(objectFound)
       * @description
       * Find first one of group of entities filtered by query dictionary
       * Returns promise resolved with this object.
       * Optionally calls a callback
       * @see AngularHuntModel.findOne
       * @returns {Promise}
       */
      Model.get = Model.findOne;

      /**
       * @name AngularHuntModel#$save
       * @description
       * Saves object instance to backend.
       * Returns promise resolved with this object.
       * Optionally calls a callback
       * @returns {Promise}
       */
      Model.prototype.$save = function (callback) {
        var t = this;
        t.$saving = true;
        return $http.patch(prefix + modelName + '/' + this.id, this)
          .then(function () {
            t.$saving = false;
            if (typeof callback === 'function') {
              callback(t);
            }
            return t;
          }, function (errorRes) {
            t.$saving = false;
            if (errorRes.status === 400) {
              t.$validationErrors = errorRes.data.validationErrors;
            }
            throw errorRes;
          })
          ;
      };
      /**
       * @name AngularHuntModel#$remove
       * @description
       * Saves object instance to backend.
       * Returns promise resolved with this object.
       * Optionally calls a callback
       * @returns {Promise}
       */
      Model.prototype.$remove = function () {
        var t = this;
        t.$saving = true;
        return $http.delete(prefix + modelName, {})
          .then(function () {
            t.$saving = false;
            t.$deleted = true;
          });
      };
      /**
       * @name AngularHuntModel#$ngChange
       * @description
       * Monitors object changing and saves object instance to backend.
       * Returns promise resolved with this object.
       * @returns {Promise}
       */
      Model.prototype.$ngChange = function (fieldName, newValue, oldValue) {
///http://stackoverflow.com/a/32534720/1885921
        var t = this;
        //console.log(fieldName);
        //console.log('New', newValue);
        //console.log('Old', oldValue);
        t.$saving = true;
        t.$desubscribe();
        return t.$save()
          .then(function () {
            t.$saving = false;
          })
          .catch(function (error) {
            if (error.status === 400) {
              t.$saving = false;
              t[fieldName] = oldValue;
              t.$subscribe();
            } else {
              throw error;
            }

          });
      };
      /**
       * @name AngularHuntModel#$watch
       * @params {object} $scope
       * @description
       * Monitors object changing and saves object instance to backend.
       * If validation errors happens on saving object, the object is reverted to previous state.
       * Returns promise resolved with this object.
       * @returns {Promise}
       */
      Model.prototype.$watch = function ($scope, item) {
        var
          t = this;

        if (t.$metadata.canWrite === true) {
          var
            i,
            fields = t.$metadata.fieldsWritable.map(function (fw) {
              return item + '.' + fw;
            });
          $scope.$watchGroup(fields, function (n, o) {
            t.$saving = true;
            t
              .$desubscribe()
              .$save()
              .then(function () {
                t.$subscribe();
                t.$saving = false;
              })
              .catch(function (error) {
                if (error.status === 400) {
                  for (i = 0; i <= t.$metadata.fieldsWritable.length; i = i + 1) {
                    t[t.$metadata.fieldsWritable[i]] = o[i];
                  }
                  t.$saving = false;
                  t.$subscribe();
                } else {
                  throw error;
                }
              });
          });
        }
      };

      Model.prototype.$subscribe = function () {
        var t = this;
        if (t.$subscribeToken) {
          t.$subscribed = true;
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

      Model.prototype.$desubscribe = function () {
        var t = this;
        if (t.$subscribeToken) {
          t.$subscribed = false;
          //todo
          //huntSocketIo.removeListener(t.$subscribeToken.toString());
        }
        return t;
      };

      return Model;
    };
  }])
  .factory('huntMessage', ['huntModel', '$http', function (huntModel) {
    return huntModel('message');
  }])
  .factory('huntUser', ['huntModel', '$http', 'huntMessage', function (huntModel, $http, huntMessage) {
    var User = huntModel('user');
    User.prototype.sendMessage = function (message, callback) {
      return huntMessage.create({'to': this.id, 'message': message.toString().trim()}, callback);
    };
    return User;
  }])
  .factory('huntMyself', ['$http', 'huntUser', 'huntMessage', function ($http, User, Message) {
    function Myself(callback) {
      var t = this;
      return $http.get('/api/v1/users/myself')
        .then(function (response) {
          if (response.status !== 200) {
            throw new Error('HuntModel:' + response.status + ':' + response.data.message);
          }
          var ret = new User();
          ret.$code = 200;
          ret.$status = response.data.status;
          ret.$metadata = response.data.metadata;
          Object.keys(response.data.data).map(function (k) {
            if (response.data.data.hasOwnProperty(k)) {
              ret[k] = response.data.data[k];
              t[k] = response.data.data[k];
            }
          });
          ret.$subscribe();
          if (typeof callback === 'function') {
            callback(ret);
          }

          ret.inbox = function (page, itemsPerPage, callback) {
            page = page || 1;
            itemsPerPage = itemsPerPage || 10;
            return Message.find({
              'sort': '-_id',
              'page': page,
              'itemsPerPage': itemsPerPage
            }, callback);
          };

          ret.getDialog = function (to, page, itemsPerPage, callback) {
            var
              toId = to.id || to,
              myId = this.id;
            page = page || 1;
            itemsPerPage = itemsPerPage || 10;
            return Message.find({
              '$or': [{'to': toId, 'from': myId}, {'from': toId, 'to': myId}],
              'sort': '+_id',
              'page': page,
              'itemsPerPage': itemsPerPage
            }, callback);
          };

          ret.logout = function (callback) {
            return $http.post('/auth/logout').then(function () {
              if (typeof callback === 'function') {
                callback();
              }
            });
          };

          return ret;
        });
    }

    return function (callback) {
      return new Myself(callback);
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
    socket.on('notify:pm:in', function (data) {
      console.log('Incoming private message', data);
    });
    socket.on('notify:pm:out', function (data) {
      console.log('Outgoing private message', data);
    });

    socket.on('currentTime', function (data) {
      if (data.time) {
        $scope.clock = new Date(data.time).toLocaleTimeString();
      }
    });
  }])
  .factory('$exceptionHandler', function () {
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