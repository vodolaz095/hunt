'use strict';
var async = require('async'),
  crypto = require('crypto'),
  validator = require('validator'),
  Q = require('q');


/**
 * @class User
 * @classdesc
 * Active record class to represent users of application, with mongodb as backend.
 * This class is ancestor of mongoose active record object, described here {@link http://mongoosejs.com/docs/documents.html},
 * {@link http://mongoosejs.com/docs/queries.html}
 *
 * @property {ObjectId} _id
 * @property {string} id
 * @property {Boolean} User#accountVerified
 * @property {string} User#salt
 * @property {string} User#password
 * @property {object} User#keychain -  object to hold all authorization methods- oauth profile ids,emails, usernames...
 * @property {string} User#huntKey - unique key, used for authorization, invalidating sessions, account confirmation, api interactions...
 * @property {Date} User#huntKeyCreatedAt
 * @property {Date} User#lastSeenOnline
 * @property {Number} User#lastSeenOnlineAgo - how long ago, in seconds, user was online.
 * @property {Boolean} User#isOnline - true, if user was online less than 60 seconds
 * @property {string} User#displayName
 * @property {object} User#name -consists of 'title','familyName', 'middleName', 'givenName'
 * @property {Boolean} User#root - does user have root permissions? default is false - no
 * @property {Boolean} User#isBanned - is user banned? default is false - no
 * @property {object} roles - hash (indexed in mongodb) to store user's roles
 * @property {object} profile - free form object, that can store any structured data associated with user account
 * @property {string} User#email - E-mail address of user, unique. Part of `keychain`
 * @property {string} User#username - Username, unique. Part of `keychain`
 * @property {string} User#gravatar
 * @property {string} User#gravatar30
 * @property {string} User#gravatar50
 * @property {string} User#gravatar80
 * @property {string} User#gravatar100
 * @fires Hunt#user:*
 * @fires Hunt#user:save
 * @fires Hunt#user:signup
 * @fires Hunt#user:signin:*
 * @fires Hunt#user:signin:providerName
 * @fires Hunt#user:notify:*
 * @fires Hunt#user:notify:sio
 * @fires Hunt#user:notify:email
 * @tutorial authorization
 */


/**
 * Namespace for events related to {@link User} model.
 *
 * @event Hunt#user:*
 * @type {object}
 * @property {string} type - type of event - `auth`,`save`...
 * @property {object} info additional information
 * @property {User} user - user, related to this event
 * @see User
 *
 */

module.exports = exports = function (core) {

//long stacktraces
  if (core.config.env === 'development'){
    Q.longStackSupport = true;
  }

//private functions
  function sha512(str) {
    return crypto.createHash('sha512').update(str).digest('hex').toString();
  }

  function md5(str) {
    return crypto.createHash('md5').update(str).digest('hex').toString();
  }

  function rack() {
    return core.rack();
  }

  function promiseSave(target) {
    var deferred = Q.defer();
    target.save(function(err, result) {
      if (err) {
        deferred.reject(err);
      } else {
        deferred.resolve(result);
      }
    });
    return deferred.promise;
  }


  var UserSchema = new core.mongoose.Schema({
      accountVerified: { type: Boolean, default: false },
      _salt: { type: String, default: rack },//string to hash password
      _password: { type: String, default: rack },//hashed password
      keychain: { type: Object, index: true, unique: true, sparse: true },

      huntKey: { type: String, required: true, index: true, unique: true, default: rack, match: /^[a-zA-Z0-9_]+$/ },
      huntKeyCreatedAt: { type: Date, default: Date.now },

      lastSeenOnline: Date,

      displayName: { type: String, trim: true },
      name: {
        title: { type: String, trim: true },
        familyName: { type: String, trim: true },
        middleName: { type: String, trim: true },
        givenName: { type: String, trim: true }
      },

      root: { type: Boolean, default: false },
      isBanned: { type: Boolean, default: false },
      profile: {},
      roles: {}
    },
    {
      toObject: { getters: true, virtuals: true }, //http://mongoosejs.com/docs/api.html#document_Document-toObject
      toJSON: { getters: true, virtuals: true }
    });

  UserSchema.index({
    huntKey: 1,
    keychain: 1,
    roles: 1
  });

  UserSchema.pre('save', function (next) {
    var err = null;
    if (this.email) {
      if (!validator.isEmail(this.email)) {
        err = new Error('Wrong email syntax for ' + this.email);
      }
    }
    this.markModified('keychain');
    this.markModified('roles');
    this.markModified('profile'); //http://mongoosejs.com/docs/schematypes.html
    next(err);
  });

  /**
   * Event is emitted each time the user profile is updated and saved
   * with payload of user being saved.
   *
   * @event Hunt#user:save
   * @type {object}
   * @property {string} type - type of event `save`...
   * @property {object} info additional information
   * @property {User} user - user, related to this event
   * @see User
   *
   */
  UserSchema.post('save', function (user) {
    core.emit(['user', 'save'], {
      'type': 'save',
      'user': user,
      'info': {}
    });
  });

  //validation for keychain - strictly no duplicates
  UserSchema.path('keychain').validate(function (value, callback) {
    var t = this;
    if (value) {
      core.async.each(Object.keys(value), function (v, cb) {
        if(core.config.env === 'development'){
          console.log('Trying to validate user #' + t._id + ' with keychain[' + v + '] equal to ' + value[v] + ' in ', t.keychain);
        }
        core.model.User.findOneByKeychain(v, value[v], function (error, userFound) {
          if (error) {
            cb(error);
          } else {
            if (userFound) {
              if (userFound._id.equals(t._id)) { //http://stackoverflow.com/a/11638106/1885921
                cb(null);
              } else {
                cb(new Error('User with keychain[' + v + ']=' + value[v] + ' already exists!'));
              }
            } else {
              cb(null);
            }
          }
        });
      }, function (error) {
        if(error){
          console.log(error);
          callback(false);
        } else {
          callback(true);
        }
      });
    } else {
      callback(true);
    }
  }, 'Keychain is in use!');

  UserSchema.methods.toJSON = function () {
    return {
      'id': this.id,
      'name': this.name,
//      'profile': this.profile,
      'displayName': this.displayName,
      'gravatar': this.gravatar,
      'gravatar30': this.gravatar30,
      'gravatar50': this.gravatar50,
      'gravatar80': this.gravatar80,
      'gravatar100': this.gravatar100,
      'roles': this.roles,
      'isBanned': this.isBanned,
      'root': this.root,
      'online': this.isOnline
    };
  };

  UserSchema.methods.toString = function () {
    return this.displayName || ('User #' + this.id);
  };

  UserSchema.virtual('email')
    .get(function () {
      return (this.keychain) ? (this.keychain.email || null) : null;
    })
    .set(function (email) {
      this.set('accountVerified', false);
      this.set('keychain.email', email);
    });

  UserSchema.virtual('username')
    .get(function () {
      if (this.keychain) {
        return this.keychain.username || null;
      } else {
        return this.displayName || 'User#' + this.id;
      }
    })
    .set(function (username) {
      this.set('keychain.username', username);
    });

  UserSchema.virtual('password')
    .get(function () {
      return function (password) {
        return (sha512(password + this._salt) === this._password);
      }
    })
    .set(function (value) {
      var salt = rack();
      this._salt = salt;
      this._password = sha512(value + salt);
    });

  /**
   * @method User#getGravatar
   * @param {number} [size=300] - image size in pixels
   * @param {string} [type='wavatar'] - type
   * @param {string} [rating='g'] - image rating, default - suitable for all sites
   * @returns {string} url to gravatar
   * @description
   * Get {@link http://en.gravatar.com/ | gravatar} for user, based on his/her email or id
   */
  UserSchema.methods.getGravatar = function (size, type, rating) {
    size = size || 300;
    type = type || 'wavatar';
    rating = rating || 'g';
    var key = (this.email) ? (this.email.toLowerCase().trim()) : this.id;
    return 'https://secure.gravatar.com/avatar/' + md5(key) + '.jpg?s=' + size + '&d=' + type + '&r=' + rating;
  };

  UserSchema.virtual('gravatar').get(function () {
    return this.getGravatar(80);
  });

  UserSchema.virtual('gravatar30').get(function () {
    return this.getGravatar(30);
  });

  UserSchema.virtual('gravatar50').get(function () {
    return this.getGravatar(50);
  });

  UserSchema.virtual('gravatar80').get(function () {
    return this.getGravatar(80);
  });

  UserSchema.virtual('gravatar100').get(function () {
    return this.getGravatar(100);
  });

  UserSchema.virtual('lastSeenOnlineAgo').get(function () {
    if (this.lastSeenOnline) {
      return ((new Date().getTime() - this.lastSeenOnline.getTime()));
    } else {
      return 10 * 365 * 24 * 60 * 60 * 1000; //month)))
    }
  });

  UserSchema.virtual('isOnline').get(function () {
    return (this.lastSeenOnlineAgo < 60000);
  });

  /**
   * @method User#invalidateSession
   * @param {function} callback - function(err, newhuntKey)
   */
  UserSchema.methods.invalidateSession = function (callback) {
    var newhuntKey = rack();
    this.huntKey = newhuntKey;
    this.huntKeyCreatedAt = new Date();
    return promiseSave(this)
      .then(function () {
        return newhuntKey;
      })
      .nodeify(callback);
  };
  /**
   * @method User#ban
   * @param {function} callback - function(err, userSaved)
   */
  UserSchema.methods.ban = function (callback) {
    this.isBanned = true;
    return promiseSave(this).nodeify(callback);
  };
  /**
   * @method User#unban
   * @param {function} callback - function(err, userSaved)
   */
  UserSchema.methods.unban = function (callback) {
    this.isBanned = false;
    return promiseSave(this).nodeify(callback);
  };

  /**
   * @method User#notify
   * @description
   * Send notifications to this user. Note, that notifications ARE not stored in database
   * @param {string} [channel="all"] channel- channel to use for notifying users
   * @param {(object|string)} message
   * @fires Hunt#user:notify:*
   * @fires Hunt#user:notify:all
   * @fires Hunt#user:notify:email
   * @fires Hunt#user:notify:sio
   * @returns {Boolean} - true, if some listener processed the event
   */
  UserSchema.methods.notify = function (channel, message) {
    var channelToUse, messageToSend;
    if (message === undefined && (typeof channel === 'object' || typeof channel === 'string')) {
      channelToUse = 'all';
      messageToSend = channel;
    } else {
      if (typeof channel === 'string' && (typeof message === 'object' || typeof message === 'string')) {
        channelToUse = channel;
        messageToSend = message;
      } else {
        throw new Error('Function User.notify([channelNameString],messageObj) has wrong arguments!');
      }
    }
    /**
     * Emitted when any of users is notified by any channel
     *
     * @see User#notify
     * @event Hunt#user:notify:*
     * @type {object}
     * @property {string} channel - name of channel being used
     * @property {User} user - user being notified
     * @property {(string|object)} message
     */

    /**
     * Emitted when any of users is notified by all channels
     *
     * @see User#notify
     * @event Hunt#user:notify:all
     * @type {object}
     * @property {string} channel - name of channel being used
     * @property {User} user - user being notified
     * @property {(string|object)} message
     */
    return core.emit('user:notify:' + channelToUse, {
      'channel': channelToUse,
      'user': this,
      'message': messageToSend
    });
  };

  /**
   * @method User#notifyByEmail
   * @description
   * Send email notification to user
   * @param {(object|string)} message
   * @fires Hunt#user:notify:email
   * @returns {Boolean} - true, if some listener processed the event, false if user do not have an email
   */
  UserSchema.methods.notifyByEmail = function (message) {
    if (this.keychain.email) {
      /**
       * Emitted when any of users is notified by email, and when
       * the user have email address, of course
       *
       * @see User#notifyByEmail
       * @event Hunt#user:notify:email
       * @type {object}
       * @property {User} user - user being notified
       * @property {(string|object)} message
       */
      return this.notify('email', message);
    } else {
      return false;
    }
  };
  /**
   * @method User#notifyBySocketIo
   * @description
   * Send socket.io notification to this particular user only.
   * @param {(object|string)} message
   * @param {string} [socketIoEventType='notify:sio'] - event name
   * @fires Hunt#user:notify:sio
   * @returns {Boolean} - true, if some listener processed the event
   */
  UserSchema.methods.notifyBySocketIo = function (message, socketIoEventType) {
    /**
     * Emitted to notify any of users by socket.io
     *
     * @see User#notifyBySocketIo
     * @event Hunt#user:notify:sio
     * @type {object}
     * @property {User} user - user being notified
     * @property {(string|object)} message - message object
     * @property {string} type - type of socket.io event to emit, default is `notify:sio`
     */
    var type = socketIoEventType || message.type || 'notify:sio';
    //return core.emit('notify:sio', {'user': this, 'type': type, 'message': message});
    return core.emit(['user', 'notify', 'sio'], {
      'channel': 'sio',
      'user': this,
      'type': type,
      'message': message
    });
  };

//finders
  /**
   * @method User.findOneByEmail
   * @param {string} email
   * @param {function} callback - function(err,userFound)
   */
  UserSchema.statics.findOneByEmail = function (email, callback) {
    var needle = {
      '$or': [
        { 'keychain.email': email },
        { 'keychain.username': email }
      ]
    };
    return Q.ninvoke(this, 'findOne', needle).nodeify(callback);
  };
  /**
   * @method User.findOneByHuntKey
   * @param {string} huntKey
   * @param {function} callback - function(err,userFound)
   */
  UserSchema.statics.findOneByHuntKey = function (huntKey, callback) {
    //this.findOne({ 'huntKey': huntKey }, callback);
    return Q.ninvoke(this, 'findOne', { 'huntKey': huntKey }).nodeify(callback);
  };
  /**
   * @method User.findOneByKeychain
   * @param {string} provider
   * @param {string} id
   * @param {function} callback - function(err,userFound)
   * @tutorial authorization
   */
  UserSchema.statics.findOneByKeychain = function (provider, id, callback) {
    var key = 'keychain.' + provider,
      needle = {};
    needle[key] = id;
    return Q.ninvoke(this, 'findOne', needle).nodeify(callback);
  };
  /**
   * @method User.findOneFuzzy
   * @param {string} idOrEmailOrHuntKey
   * @param {function} callback - function(err,userFound){...}
   * @tutorial authorization
   * @description
   * Find one user by _id, username,email, huntKey
   */
  UserSchema.statics.findOneFuzzy = function (idOrEmailOrHuntKey, callback) {
    if (/^[0-9a-fA-F]{24}$/.test(idOrEmailOrHuntKey)) {
      return Q.ninvoke(this, 'findById', idOrEmailOrHuntKey).nodeify(callback);
    } else {
      var needle = {
        $or: [
          { 'keychain.email': idOrEmailOrHuntKey },
          { 'keychain.username': idOrEmailOrHuntKey },
          { 'huntKey': idOrEmailOrHuntKey }
        ]
      };
      return Q.ninvoke(this, 'findOne', needle).nodeify(callback);
    }
  };


//local strategy (username/email and password)
  /**
   * @method User.signUp
   * @param {string} email
   * @param {string} password
   * @param {function} callback - function(error, userSignedUp){}
   * @tutorial authorization
   * @fires  Hunt#user:signup
   */
  UserSchema.statics.signUp = function (email, password, callback) {
    return Q.ninvoke(this, 'create', {
      'accountVerified': false,
      'displayName': email.split('@')[0],
      'keychain': { 'email': email, 'welcomeLink': core.rack() },
      'password': password
    })
      .then(function (newUser) {
        /**
         * Event is emited each time user sign's up
         *
         * @event Hunt#user:signup
         * @type {object}
         * @property {string} type - type of event `signup`
         * @property {object} info additional information
         * @property {User} user - user, related to this event
         * @tutorial authorization
         * @see User
         *
         * @example
         *
         * Hunt.on('user:signup', function(payload){
         *   console.log('We catch '+this.event.join(':') + 'event, which means '+ payload.user.displayName + ' signed up by local strategy!');
         * });
         */
        core.emit(['user', 'signup'], {
          'user': newUser,
          'type': 'signup',
          'info': {
            'email': email
          }
        });
        return newUser;
      })
      .nodeify(callback);
  };
  /**
   * @method User.signIn
   * @param {string} email
   * @param {string}  password
   * @param {function} callback - function(error, userSigned){}
   * @tutorial authorization
   * @fires  Hunt#user:signin:local
   */
  UserSchema.statics.signIn = function (email, password, callback) {
    return Q.ninvoke(this, 'findOneByEmail', email)
      .then(function (userFound) {
        if (userFound) {
          if (userFound.password(password)) {
            /**
             * Event is emitted each time user signs in
             *
             * @event Hunt#user:signin:*
             * @type {object}
             * @property {string} type - type of event `auth`
             * @property {object} info additional information
             * @property {User} user - user, related to this event
             * @tutorial authorization
             * @see User
             *
             * @example
             *
             * Hunt.on('user:signin:*', function(payload){
             *   console.log('We catch '+this.event.join(':') + 'event, which means '+ payload.user.displayName + ' signed in!');
             * });
             *
             */


            /**
             * Event is emitted each time user signs in
             *
             * @event Hunt#user:signin:local
             * @type {object}
             * @property {string} type - type of event `auth`
             * @property {object} info additional information
             * @property {User} user - user, related to this event
             * @tutorial authorization
             * @see User
             *
             * @example
             *
             * Hunt.on('user:signin:local', function(payload){
             *   console.log('We catch '+this.event.join(':') + 'event, which means '+ payload.user.displayName + ' authorized by local strategy!');
             * });
             *
             */
            core.emit(['user', 'signin', 'local'], {
              'method': 'local',
              'user': userFound,
              'type': 'signin',
              'info': {
                'email': email
              }
            });
            return userFound;
          } else {
            return false;
          }
        } else {
          return false;
        }
      })
      .nodeify(callback);
  };
  /**
   * @method User.findOneByHuntKeyAndVerifyEmail
   * @param {string} welcomeLink
   * @tutorial authorization
   * @param {function} callback - function(error, userSigned){}
   */
  UserSchema.statics.findOneByHuntKeyAndVerifyEmail = function (welcomeLink, callback) {
    return Q.ninvoke(this, 'findOneByKeychain', 'welcomeLink', welcomeLink)
      .then(function (userFound) {
        if (userFound && userFound.accountVerified === false) {
          delete userFound.keychain.welcomeLink;
          userFound.markModified('keychain');
          userFound.accountVerified = true;
          return promiseSave(userFound);
        } else {
          throw new Error('Activation key is wrong or outdated!');
        }
      })
      .nodeify(callback);
  };
  /**
   * @method User.findOneByHuntKeyAndResetPassword
   * @tutorial authorization
   * @description
   * This function is used for reseting users password by link in email with submitting form later
   * @param {string} welcomeLink - welcome lint to use
   * @param {string} password - new password to set
   * @param {function} callback  - function(error, userFoundAndUpdated) is fired when user is saved
   */
  UserSchema.statics.findOneByHuntKeyAndResetPassword = function (welcomeLink, password, callback) {
    return Q.ninvoke(this, 'findOneByKeychain', 'welcomeLink', welcomeLink)
      .then(function (userFound) {
        if (userFound && (new Date().getTime() - userFound.huntKeyCreatedAt.getTime()) < 30 * 60 * 1000) {
          userFound.password = password;
          return promiseSave(userFound);
        } else {
          throw new Error('Activation key is wrong or outdated!');
        }
      })
      .nodeify(callback);
  };

//oauth providers - twitter, facebook, github, other ones
  /**
   * @method User#setKeyChain
   * @tutorial authorization
   * @param {string} provider - provider name, for example - twitter, github, google
   * @param {string} id - id of user on this provider
   * @param {function} callback - function(err,userSaved){..}
   */
  UserSchema.methods.setKeyChain = function (provider, id, callback) {
    this.keychain = this.keychain || {};
    this.keychain[provider] = id;
    return promiseSave(this).nodeify(callback);
  };
  /**
   * @method User#revokeKeyChain
   * @tutorial authorization
   * @param {string} provider - provider name, for example - twitter, github, google
   * @param {function} callback - function(err,userSaved)
   */
  UserSchema.methods.revokeKeyChain = function (provider, callback) {
    this.keychain[provider] = null;
    this.markModified('keychain'); //http://mongoosejs.com/docs/schematypes.html
    return promiseSave(this).nodeify(callback);
  };
  /**
   * @method User.processOAuthProfile
   * @param {User} user - currently authorized user in controller (from `request.user`)
   * @param {object} profile
   * @param {function} callback - function(err,userAuthorized)
   * @fires  Hunt#user:signin:providerName
   * @tutorial authorization
   * @see request
   * @description
   * Function to process oauth profile, and if user is authorized, we attach this profile to his keychain
   * If user is not authorized and found, we sign up him/her
   * with accountVerified
   */
  UserSchema.statics.processOAuthProfile = function (user, profile, callback) {
    var User = this;
    if (profile && profile.provider && typeof profile.provider === 'string') {
      if (profile.id) {
        //ok
      } else {
        callback(new Error('User profile do not have `id` - ' + JSON.stringify(profile)));
        return;
      }
    } else {
      callback(new Error('User profile do not have `provider` - ' + JSON.stringify(profile)));
      return;
    }

    if (user) {
//attaching profile to user
      user.setKeyChain(profile.provider, profile.id, callback);
    } else {
      User.findOneByKeychain(profile.provider, profile.id, function (err, userFound) {
        if (err) {
          callback(err);
        } else {
          if (userFound) {
            /**
             * Event is emitted each time user signs in by keychain
             *
             * @event Hunt#user:signin:providerName
             * @type {object}
             * @property {string} method - name of provider user
             * @property {object} info additional information
             * @property {User} user - user, related to this event
             * @tutorial authorization
             * @see User
             *
             * @example
             *
             * Hunt.on('user:signin:github', function(payload){
               *   console.log('We catch '+this.event.join(':') + 'event, which means '+ payload.user.displayName + ' authorized by github!');
               * });
             *
             */
            core.emit(['user', 'signin', profile.provider], {
              'method': profile.provider,
              'info': {
                'profileId': profile.id
              },
              'user': userFound
            });
            callback(null, userFound);
          } else {
            User.create({
              'accountVerified': true,
              'lastSeenOnline': Date.now(),
              'displayName': profile.displayName,
              'name': profile.name
            }, function (err, userCreated) {
              if (err) {
                callback(err);
              } else {
                core.emit(['user', 'signin', profile.provider], {
                  'method': profile.provider,
                  'info': {
                    'provider': profile.provider,
                    'profileId': profile.id
                  },
                  'user': userCreated
                });
                userCreated.setKeyChain(profile.provider, profile.id, callback);
              }
            });
          }
        }
      });
    }
  };

//dialog messages system
  /**
   * @method User#sendMessage
   * @description
   * Sends private message from this user to other one
   * @example
   *
   * User1.sendMessage(User2,'hello!',function(err){if(err) throw err;});
   * //User1 sends message to User2
   *
   * @param {User/string} to - receiver of message
   * @param {string} message - text of message
   * @param {function} callback -function to be called on message delivery
   */
  UserSchema.methods.sendMessage = function (to, message, callback) {
    var thisUser = this;
    async.waterfall([
      function (cb) {
        if (typeof to === 'string') {
          core.model.User.findOneFuzzy(to, cb);
        } else {
          if (to._id) {
            cb(null, to);
          } else {
            cb(new Error('to have to be user instance or string of username or email'));
          }
        }
      },
      function (userFound, cb) {
        core.model.Message.create({
          'to': userFound._id,
          'from': thisUser._id,
          'message': message
        }, function (err, messageCreated) {
          if (err) {
            cb(err);
          } else {
            cb(null, userFound, messageCreated);
          }
        });
      },
      function (to, messageCreated, cb) {
        core.emit('user:notify:sio', {
          'user': to,
          'from': thisUser,
          'type': 'dialog',//':incoming',
          'message': messageCreated.message
        });
        /**
         * Event is emitted each time user recieves a message via dialog api
         *
         * @event Hunt#user:notify:pm
         * @type {object}
         * @property {User} to - reciever of the message
         * @property {User} from - sender of the message
         * @property {type} type of message
         * @see User
         *
         * @example
         *
         * Hunt.on('user:notify:pm', function(payload){
         *   console.log(payload.from+ ' says to '+payload.user + ' ' + payload.message + ' via ' + payload.type );
         * });
         *
         */
        core.emit('user:notify:pm', {
          'user': to,
          'from': thisUser,
          'type': 'dialog',
          'message': messageCreated.message
        });
        cb();
      }
    ], callback);
  };
  /**
   * @method User#receiveMessage
   * @description
   * Sends private message to this user from other one
   * @example
   *
   * User1.sendMessage(User2,'hello!',function(err){if(err) throw err;});
   * //User1 sends message to User2
   *
   * @param {User/string} from - receiver of message
   * @param {string} message - text of message
   * @param {function} callback -function to be called on message delivery
   */
  UserSchema.methods.receiveMessage = function (from, message, callback) {
    var thisUser = this;
    async.waterfall([
      function (cb) {
        if (typeof from === 'string') {
          core.model.User.findOneFuzzy(from, cb);
        } else {
          if (from._id) {
            cb(null, from);
          } else {
            cb(new Error('to have to be user instance or string of username or email'));
          }
        }
      },
      function (userFound, cb) {
        core.model.Message.create({
          'from': userFound._id,
          'to': thisUser._id,
          'message': message
        }, function (err, messageCreated) {
          if (err) {
            cb(err);
          } else {
            cb(null, userFound, messageCreated);
          }
        });
      },
      function (from, messageCreated, cb) {
        /**
         * Event is emitted each time user recieves a message via dialog api
         *
         * @event Hunt#user:notify:pm
         * @type {object}
         * @property {User} to - reciever of the message
         * @property {User} from - sender of the message
         * @property {type} type of message
         * @see User
         *
         * @example
         *
         * Hunt.on('user:notify:pm', function(payload){
         *   console.log(payload.from+ ' says to '+payload.user + ' ' + payload.message + ' via ' + payload.type );
         * });
         *
         */

        core.emit('user:notify:sio', {
          'user': thisUser,
          'from': from,
          'type': 'dialog',//':incoming', //probab;y?
          'message': messageCreated.message
        });

        core.emit('user:notify:pm', {
          'user': thisUser,
          'from': from,
          'type': 'dialog',
          'message': messageCreated.message
        });
        cb();
      }
    ], callback);
  };
  /**
   * @method User#getRecentMessages
   * @description
   * Get recent messages in reverse chronological order - the most recent on top
   * @param {int} messageLimit - limit of messages
   * @param {int} messageOffset - offset
   * @param {function} callback -function(err,messages) to be called with message object
   */
  UserSchema.methods.getRecentMessages = function (messageLimit, messageOffset, callback) {
    var thisUser = this;
    messageLimit = messageLimit || 100;
    messageOffset = messageOffset || 0;
    return core.model.Message
      .find({
        $or: [
          { 'to': thisUser._id },
          { 'from': thisUser._id }
        ]
      })
      .skip(messageOffset)
      .limit(messageLimit)
      .sort('-createdAt')
      .populate('to from')
//      .populate('from')
      .exec(callback);
  };
  /**
   * @method User#getDialog
   * @description
   * Get recent messages for dialog with this and user with username in reverse chronological order  - the most recent on top
   * @param {User} usernameOrUser - author of message - string of username/email or user object
   * @param {int} messageLimit - limit of messages
   * @param {int} messageOffset - offset
   * @param {function} callback -function(err,messages) to be called with message object
   */
  UserSchema.methods.getDialog = function (usernameOrUser, messageLimit, messageOffset, callback) {
    var thisUser = this;
    messageLimit = messageLimit || 100;
    messageOffset = messageOffset || 0;
    async.waterfall([
      function (cb) {
        if (typeof usernameOrUser === 'string') {
          core.model.User.findOneFuzzy(usernameOrUser, cb);
        } else {
          if (usernameOrUser._id) {
            cb(null, usernameOrUser);
          } else {
            cb(new Error('usernameOrUser have to be user instance or string of username or email'));
          }
        }
      },
      function (userFound, cb) {
        if (userFound) {
          core.model.Message
            .find({
              $or: [
                { 'to': thisUser._id, 'from': userFound._id },
                { 'from': thisUser._id, 'to': userFound._id }
              ]
            })
            .limit(messageLimit)
            .skip(messageOffset)
            .sort('-createdAt')
            .populate('to from') //todo - is it cached???
//            .populate('from')
            .exec(cb);
        } else {
          cb(new Error('User do not exists!'));
        }
      }
    ], callback);
  };

  /**
   * @method User#hasRole
   * @param {String} roleName - name of the role
   * @returns {Boolean} - true, if user has the Role required
   * @tutorial authorization
   * @example
   *
   * Hunt.model.User.find({}, function(error, usersFound){
   *   if(error) {
   *     throw error;
   *   } else {
   *     usersFound.map(function(user){
   *       if(!user.hasRole('hunter')){
   *         throw new Error('User #'+user.id +' is not a Hunter! We need to punish him/her!');
   *       }
   *     });
   *   }
   * });
   *
   */
  UserSchema.methods.hasRole = function (roleName) {
    return (this.roles && this.roles[roleName]) ? true : false;
  };

  //default ACL for exporting model

  UserSchema.statics.canCreate = function (user, callback) {
    callback(null, true, false);
  };

  UserSchema.statics.listFilter = function (user, callback) {
    if (user) {
      if (user.root) {
        callback(null, {}, [
          '_id', 'id',
          'accountVerified',
          'email', 'username',
          'gravatar30', 'gravatar50', 'gravatar80', 'gravatar100',
          'name', 'displayName',
          'root',
          'isBanned',
          'isOnline', 'lastSeenOnlineAgo', 'lastSeenOnline',
          'profile'
        ]);
      } else {
        callback(null, {}, [
          '_id', 'id',
          'accountVerified',
//          'email',
          'username',
          'gravatar30', 'gravatar50', 'gravatar80', 'gravatar100',
          'name', 'displayName',
          'root',
          'isBanned',
          'isOnline', 'lastSeenOnlineAgo', 'lastSeenOnline'
        ]);
      }
    } else {
      callback(null, false);
    }
  };

  UserSchema.methods.canRead = function (user, callback) {
    if (user.id == this.id || user.root) {
      callback(null, true, [
        '_id',
        'id',
        'accountVerified',
        'keychain',
        'lastSeenOnline',
        'name', 'displayName',
        'roles', 'root', 'isBanned',
        'profile',
        'isOnline', 'lastSeenOnlineAgo', 'lastSeenOnline'
      ]);
    } else {
      callback(null, true, [
        '_id', 'id',
        'accountVerified',
        'username',
        'gravatar30', 'gravatar50', 'gravatar80', 'gravatar100',
        'name', 'displayName',
        'root',
        'isBanned',
        'isOnline', 'lastSeenOnlineAgo', 'lastSeenOnline'
      ]);
    }
  };

  UserSchema.methods.canUpdate = function (user, callback) {
    if (user && user.id == this.id) {
      callback(null, true, ['name', 'displayName', 'profile', 'password', 'email']);
      return;
    }
    if (user && user.root) {
      callback(null, true, [
        'name', 'displayName', 'roles', 'root', 'isBanned',
        'profile', 'password', 'email', 'keychain'
      ]);
      return;
    }
    callback(null, false);
  };

  UserSchema.methods.canDelete = function (user, callback) {
    callback(null, (user && user.root));
  };

  return core.mongoConnection.model('User', UserSchema);
};

