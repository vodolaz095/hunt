'use strict';

var
  fieldsReadable = [
    '_id',
    'id',
    'accountVerified',
    'lastSeenOnline',
    'name',
    'familyName', 'middleName', 'givenName',
    'displayName',
    'roles',
    'root',
    'isBanned',
    'gravatar',
    'gravatar30',
    'gravatar50',
    'gravatar80',
    'gravatar100',
    '$subscribeToken',
    'isOnline',
    'lastSeenOnlineAgo',
    'lastSeenOnline'
  ],
  fieldsReadableByRootOrSelf = [
    '_id',
    'id',
    'accountVerified',
    'keychain.username',
    'keychain.email',

    'keychain.google',
    'keychain.github',
    'keychain.twitter',
    'keychain.facebook',
    'keychain.vkontakte',
    'keychain.steam',

    'lastSeenOnline',
    'name',
    'familyName', 'middleName', 'givenName',
    'displayName',
    'roles',
    'root',
    'isBanned',
    'profile',
    'gravatar',
    'gravatar30',
    'gravatar50',
    'gravatar80',
    'gravatar100',
    '$subscribeToken',
    'isOnline',
    'lastSeenOnlineAgo',
    'lastSeenOnline'
  ],
  fieldsWritable = [
    'displayName', 'familyName', 'middleName', 'givenName', 'password', 'email'
  ],
  fieldsWritableByRoot = [
    'name', 'displayName', 'roles', 'root', 'isBanned',
    'familyName', 'middleName', 'givenName',
    'profile', 'password', 'email', 'keychain'
  ];


/**
 * @class User
 * @classdesc
 * Active record class to represent users of application, with mongodb as backend.
 * This class is ancestor of mongoose active record object, described here {@link http://mongoosejs.com/docs/documents.html},
 * {@link http://mongoosejs.com/docs/queries.html}
 *
 * @property {ObjectId} _id
 * @property {string} id
 * @property {Boolean} accountVerified
 * @property {string} salt
 * @property {string} password
 * @property {object} keychain -  object to hold all authorization methods- oauth profile ids,emails, usernames...
 * @property {string} huntKey - unique key, used for authorization, invalidating sessions, account confirmation, api interactions...
 * @property {Date} huntKeyCreatedAt
 * @property {Date} lastSeenOnline
 * @property {Number} lastSeenOnlineAgo - how long ago, in seconds, user was online.
 * @property {Boolean} isOnline - true, if user was online less than 60 seconds
 * @property {string} displayName
 * @property {object} name -consists of 'title','familyName', 'middleName', 'givenName'
 * @property {Boolean} root - does user have root permissions? default is false - no
 * @property {Boolean} isBanned - is user banned? default is false - no
 * @property {object} roles - hash (indexed in mongodb) to store user's roles
 * @property {object} profile - free form object, that can store any structured data associated with user account
 * @property {string} email - E-mail address of user, unique. Part of `keychain`
 * @property {string} username - Username, unique. Part of `keychain`
 * @property {string} gravatar - link to gravatar image of user with 300x300 pixels size
 * @property {string} gravatar30 - link to gravatar image of user with 30x30 pixels size
 * @property {string} gravatar50 - link to gravatar image of user with 50x50 pixels size
 * @property {string} gravatar80 - link to gravatar image of user with 80x80 pixels size
 * @property {string} gravatar100 - link to gravatar image of user with 100x100 pixels size
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

  var
    rack = core.rack,
    sha512 = core.sha512,
    md5 = core.md5,
    ValidationError = core.mongoose.Error.ValidationError,
    ValidatorError = core.mongoose.Error.ValidatorError,
    async = core.async,
    Q = core.Q,
    validator = core.validator,
    UserSchema = new core.mongoose.Schema(
      {
        accountVerified: {type: Boolean, default: false, index: true},
        _salt: {type: String, default: rack},//string to hash password
        _password: {type: String, default: rack},//hashed password
        keychain: {type: Object, index: true, unique: true, sparse: true},

        huntKey: {
          type: String,
          required: true,
          index: true,
          unique: true,
          default: rack,
          match: /^[a-zA-Z0-9_]+$/
        },
        huntKeyCreatedAt: {type: Date, default: Date.now},

        lastSeenOnline: Date,

        displayName: {type: String, trim: true},
        name: {
          title: {type: String, trim: true},
          familyName: {type: String, trim: true},
          middleName: {type: String, trim: true},
          givenName: {type: String, trim: true}
        },

        root: {type: Boolean, default: false},
        isBanned: {type: Boolean, default: false},
        profile: {},
        roles: {}
      },
      {
        toObject: {getters: true, virtuals: true}, //http://mongoosejs.com/docs/api.html#document_Document-toObject
        toJSON: {getters: true, virtuals: true}
      }
    );


//long stacktraces
  if (core.config.env === 'development') {
    Q.longStackSupport = true;
  }

  function promiseSave(target) {
    var deferred = Q.defer();
    target.save(function (err, result) {
      if (err) {
        deferred.reject(err);
      } else {
        deferred.resolve(result);
      }
    });
    return deferred.promise;
  }

  UserSchema.index({
    huntKey: 1,
    keychain: 1,
    roles: 1
  });

  UserSchema.pre('save', function (next) {
    var err = null;
    if (this.email) {
      if (!validator.isEmail(this.email)) {
        err = new ValidationError(this);
        err.errors.email = new ValidatorError('email', 'Email has invalid syntax!', 'notvalid', this.email);
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
        if (error) {
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

    var
      t = this,
      name,
      out = [];

    ['title', 'familyName', 'middleName', 'givenName'].map(function (n) {
      if (t.name[n]) {
        out.push(t.name[n]);
      }
    });

    name = (out.length > 0) ? out.join(' ') : null;


    return name || this.displayName || this.username || ('User #' + this.id);
  };

  UserSchema.virtual('email')
    .get(function () {
      return (this.keychain) ? (this.keychain.email || null) : null;
    })
    .set(function (email) {
      if (email !== undefined) {
        this.set('accountVerified', false);
        this.set('keychain.email', email.toString().toLowerCase());
      }
    });

  UserSchema.virtual('myself')
    .get(function () {
      return true;
    });

  UserSchema.virtual('username')
    .get(function () {
      if (this.keychain) {
        return this.keychain.username || null;
      }
      return this.displayName || 'User#' + this.id;
    })
    .set(function (username) {
      this.set('keychain.username', username);
    });

  UserSchema.virtual('familyName')
    .get(function () {
      return (this.name) ? (this.name.familyName || null) : null;
    })
    .set(function (val) {
      this.set('name.familyName', val);
    });

  UserSchema.virtual('middleName')
    .get(function () {
      return (this.name) ? (this.name.middleName || null) : null;
    })
    .set(function (val) {
      this.set('name.middleName', val);
    });

  UserSchema.virtual('givenName')
    .get(function () {
      return (this.name) ? (this.name.givenName || null) : null;
    })
    .set(function (val) {
      this.set('name.givenName', val);
    });

  UserSchema.virtual('password')
    .get(function () {
      return function (password) {
        return (sha512(password + this._salt) === this._password);
      };
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
    }
    return 10 * 365 * 24 * 60 * 60 * 1000; //month)))
  });

  UserSchema.virtual('isOnline').get(function () {
    return (this.lastSeenOnlineAgo < 60000);
  });

  /**
   * @method User#invalidateSession
   * @this User
   * @param {function} callback - function(err, newhuntKey)
   * @see User#huntKey
   * @description
   * Invalidates session, forcing user to be logged out on every clien by means of regenerating huntkey
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
   * @this User
   * @param {function} callback - function(err, userSaved)
   */
  UserSchema.methods.ban = function (callback) {
    this.isBanned = true;
    return promiseSave(this).nodeify(callback);
  };
  /**
   * @method User#unban
   * @this User
   * @param {function} callback - function(err, userSaved)
   */
  UserSchema.methods.unban = function (callback) {
    this.isBanned = false;
    return promiseSave(this).nodeify(callback);
  };

  /**
   * @method User#notify
   * @this User
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
   * @this User
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
    }
    return false;
  };
  /**
   * @method User#notifyBySocketIo
   * @this User
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
   * @method User.findOneByEmailOrUsername
   * @param {string} emailOrUsername
   * @param {function} callback - function(err,userFound)
   */
  UserSchema.statics.findOneByEmailOrUsername = function (emailOrUsername, callback) {
    var needle = {
      '$or': [
        {'keychain.email': emailOrUsername},
        {'keychain.username': emailOrUsername}
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
    return Q.ninvoke(this, 'findOne', {'huntKey': huntKey}).nodeify(callback);
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
    }
    var needle = {
      $or: [
        {'keychain.email': idOrEmailOrHuntKey},
        {'keychain.username': idOrEmailOrHuntKey},
        {'huntKey': idOrEmailOrHuntKey}
      ]
    };
    return Q.ninvoke(this, 'findOne', needle).nodeify(callback);
  };


//local strategy (username/email and password)
  /**
   * @method User.signUp
   * @param {string} username
   * @param {string} email
   * @param {string} password
   * @param {function} callback - function(error, userSignedUp){}
   * @tutorial authorization
   * @fires  Hunt#user:signup
   */
  UserSchema.statics.signUp = function (username, email, password, callback) {
    var
      User = this;
    return Q
      .fcall(function () {
        if (!core.validator.isEmail(email)) {
          throw new Error('Malformed email!');
        }
      })
      .then(function () {
        var user = new User();
        user.accountVerified = false;
        user.keychain = {};
        user.keychain.email = email.toString().toLowerCase();
        if (username) {
          user.displayName = username.toString().toLowerCase();
          user.keychain.username = username.toString().toLowerCase();
        }
        user.keychain.welcomeLink = core.rack();
        user.huntKey = core.rack();
        user.password = password;
        //return Q.ninvoke(user, 'save');
        return promiseSave(user);
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
    return Q.ninvoke(this, 'findOneByEmailOrUsername', email)
      .then(function (userFound) {
        if (userFound) {
          if (userFound.password(password)) {
            return userFound;
          }
        }
        return false;
      })
      .nodeify(callback);
  };
  /**
   * @method User.findOneByWelcomeLinkAndVerifyEmail
   * @param {string} welcomeLink
   * @tutorial authorization
   * @param {function} callback - function(error, userSigned){}
   */
  UserSchema.statics.findOneByWelcomeLinkAndVerifyEmail = function (welcomeLink, callback) {
    return Q.ninvoke(this, 'findOneByKeychain', 'welcomeLink', welcomeLink)
      .then(function (userFound) {
        if (userFound && userFound.accountVerified === false) {
          delete userFound.keychain.welcomeLink;
          userFound.markModified('keychain');
          userFound.accountVerified = true;
          return promiseSave(userFound);
        }
        throw new Error('Activation key is wrong or outdated!');
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
    return Q
      .ninvoke(this, 'findOneByWelcomeLinkAndVerifyEmail', welcomeLink)
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
        }
        throw new Error('Activation key is wrong or outdated!');
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
   * @param {request} request - current request (from controllers `request`)
   * @param {object} profile
   * @param {function} callback - function(err,userAuthorized)
   * @fires  Hunt#user:signin:providerName
   * @tutorial authorization
   * @see request
   * @this User
   * @since 0.4.18
   * @description
   * Function to process oauth profile, and if user is authorized, we attach this profile to his keychain
   * If user is not authorized and found, we sign up him/her
   * with accountVerified
   */
  UserSchema.statics.processOAuthProfile = function (request, profile, callback) {
    var User = this;
    if (profile && profile.provider && typeof profile.provider === 'string') {
      if (!profile.id) {
        callback(new Error('User profile do not have `id` - ' + JSON.stringify(profile)));
        return;
      }
    } else {
      callback(new Error('User profile do not have `provider` - ' + JSON.stringify(profile)));
      return;
    }

    if (request.user) {
//attaching profile to user
      request.user.setKeyChain(profile.provider, profile.id, callback);
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
             * @property {object} profile - profile as received from Oauth provider
             * @property {User} user - user, related to this event
             * @property {string} ip - IP address being used by user
             * @property {string} ips - IP addresses chain being used including proxies
             * @property {string} userAgent - user agent being used by user
             * @tutorial authorization
             * @since 0.4.18
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
              'ip': request.ip,
              'ips': request.ips,
              'userAgent': request.headers['user-agent'],
              'method': profile.provider,
              'profile': profile,
              'user': userFound
            });

            winston.info('user:signup:%s:%s', profile.provider, request.user.id, {
              'ip': request.ip,
              'ips': request.ips,
              'userId': request.user.id,
              'userEmail': request.user.email,
              'userName': request.user.username,
              'user': request.user.toString()
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
                  'ip': request.ip,
                  'ips': request.ips,
                  'userAgent': request.headers['user-agent'],
                  'method': profile.provider,
                  'profile': profile,
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
        cb(null, messageCreated);
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
        cb(null, messageCreated);
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
          {'to': thisUser._id},
          {'from': thisUser._id}
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
        core.model.User.findOneFuzzy(usernameOrUser, cb);
      },
      function (userFound, cb) {
        core.model.Message
          .count({
            $or: [
              {'to': thisUser._id, 'from': userFound._id},
              {'from': thisUser._id, 'to': userFound._id}
            ]
          })
          .exec(function (error, numberOfMessages) {
            cb(error, userFound, numberOfMessages);
          });
      },
      function (userFound, numberOfMessages, cb) {
        if (userFound) {
          core.model.Message
            .find({
              $or: [
                {'to': thisUser._id, 'from': userFound._id},
                {'from': thisUser._id, 'to': userFound._id}
              ]
            })
            .limit(messageLimit)
            .skip(messageOffset)
            .sort('-createdAt')
            .populate('to from') //todo - is it cached???
            //            .populate('from')
            .exec(function (error, messagesFound) {
              cb(error, messagesFound, numberOfMessages);
            });
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
    process.nextTick(function () {
      callback(null, false);
    });
  };

  UserSchema.statics.listFilter = function (user, callback) {
    process.nextTick(function () {
      if (user) {
        if (user.root) {
          callback(null, {}, fieldsReadableByRootOrSelf);
        } else {
          callback(null, {'accountVerified': true}, fieldsReadable);
        }
      } else {
        callback(null, false);
      }
    });
  };

  UserSchema.methods.canRead = function (user, callback) {
    var t = this;
    process.nextTick(function () {
      if (user) {
        if (t._id.equals(user._id)) {
          return callback(null, true, fieldsReadableByRootOrSelf.concat(['myself', 'huntKey']));
        }
        if (user.root) {
          return callback(null, true, fieldsReadableByRootOrSelf);
        }
      }
      callback(null, true, fieldsReadable);
    });
  };

  UserSchema.methods.canUpdate = function (user, callback) {
    var t = this;
    process.nextTick(function () {
      if (user && t._id.equals(user._id)) {
        callback(null, true, fieldsWritable);
        return;
      }
      if (user && user.root) {
        callback(null, true, fieldsWritableByRoot);
        return;
      }
      callback(null, false);
    });
  };

  UserSchema.methods.canDelete = function (user, callback) {
    process.nextTick(function () {
      callback(null, (user && user.root));
    });
  };

  return core.mongoConnection.model('User', UserSchema);
};

