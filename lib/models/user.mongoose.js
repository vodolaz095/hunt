'use strict';
var async = require('async'),
  crypto = require('crypto'),
  validator = require('validator');


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
 * @property {string} User#apiKey - unique key, used for authorization, invalidating sessions, account confirmation, api interactions...
 * @property {Date} User#apiKeyCreatedAt
 * @property {Date} User#lastSeenOnline
 * @property {Number} User#lastSeenOnlineAgo - how long ago, in seconds, user was online.
 * @property {Boolean} User#isOnline - true, if user was online less than 60 seconds
 * @property {string} User#displayName
 * @property {object} User#name -consists of 'familyName', 'middleName', 'givenName''
 * @property {Boolean} User#root - is user have root permissions? default is false - no
 * @property {Boolean} User#isBanned - is user banned? default is false - no
 * @property {Array.<Group>} User#groups
 * @property {object} profile - free form object, that can store any structured data associated with user account
 * @property {string} User#email - E-mail address of user, unique.
 * @property {string} User#username - Username, unique.
 * @property {string} User#gravatar
 * @property {string} User#gravatar30
 * @property {string} User#gravatar50
 * @property {string} User#gravatar80
 * @property {string} User#gravatar100
 */

module.exports = exports = function (core) {

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

  var UserSchema = new core.mongoose.Schema({
      accountVerified: {type: Boolean, default: false},
      salt: {type: String, default: rack},//string to hash password
      password: {type: String, default: rack},//hashed password
      keychain: {type: Object, index: true, unique: true, sparse: true},

      apiKey: {type: String, required: true, index: true, unique: true, default: rack, match: /^[a-zA-Z0-9_]+$/ },
      apiKeyCreatedAt: {type: Date, default: Date.now},

      lastSeenOnline: Date,

      displayName: {type: String, trim: true},
      name: {
        familyName: {type: String, trim: true},
        middleName: {type: String, trim: true},
        givenName: {type: String, trim: true}
      },

      root: {type: Boolean, default: false},
      isBanned: {type: Boolean, default: false},
      groups: [
        { type: core.mongoose.Schema.Types.ObjectId, ref: 'Group' }
      ],
      profile: {}
    },
    {
      toObject: { getters: true, virtuals: true }, //http://mongoosejs.com/docs/api.html#document_Document-toObject
      toJSON: { getters: true, virtuals: true }
    });

  UserSchema.index({
    apiKey: 1,
    keychain: 1
  });

  UserSchema.pre('save', function (next) {
    var err = null;
    if (this.email) {
      if (!validator.isEmail(this.email)) {
        err = new Error('Wrong email syntax for ' + this.email);
      }
    }
    this.markModified('profile'); //http://mongoosejs.com/docs/schematypes.html
    next(err);
  });

/**
 * Event is emitted each time the user profile is updated and saved
 * with payload of user being saved.
 *
 * @event Hunt#user:save
 * @type {User}
 *
 */
  UserSchema.post('save', function (user) {
    core.emit('user:save', user);
  });

  UserSchema.methods.toJSON = function () {
    return {
      'id': this.id,
      'name': this.name,
      'profile': this.profile,
      'displayName': this.displayName,
      'gravatar': this.gravatar,
      'gravatar30': this.gravatar30,
      'gravatar50': this.gravatar50,
      'gravatar80': this.gravatar80,
      'gravatar100': this.gravatar100,
      'online': this.isOnline
    };
  };

  UserSchema.methods.toString = function() {
    return this.displayName || ('User #'+this.id);
  }

  UserSchema.virtual('email')
    .get(function () {
      return (this.keychain) ? (this.keychain.email || null) : null;
    }
  )
    .set(function (email) {
      this.set('keychain.email', email);
      this.markModified('keychain');
    }
  );

  UserSchema.virtual('username')
    .get(function () {
      if(this.keychain){
        return this.keychain.username || null;
      } else {
        return this.displayName || this.id;
      }
    })
    .set(function (username) {
      this.set('keychain.username', username);
      this.markModified('keychain');
    });
/**
 * @method User#getGravatar
 * @param {number} size [300] - image size in pixels
 * @param {string} type [wavatar] - type
 * @param {string} rating [g] - image rating, default - suitable for all sites
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
   * @method User#verifyPassword
   * @param {string} password - password to check
   * @returns {boolean} - true if password is correct
   */
  UserSchema.methods.verifyPassword = function (password) {
    return (sha512(password + this.salt) === this.password);
  };

  /**
   * @method User#setPassword
   * @param {string} newPassword
   * @param {function} callback - function(err,userSaved)
   */
  UserSchema.methods.setPassword = function (newPassword, callback) {
    var salt = rack();
    this.salt = salt;
    this.password = sha512(newPassword + salt);
    this.save(callback);
  };

  /**
   * @method User#invalidateSession
   * @param {function} callback - function(err, newApiKey)
   */
  UserSchema.methods.invalidateSession = function (callback) {
    var newApiKey = rack();
    this.apiKey = newApiKey;
    this.apiKeyCreatedAt = new Date();
    this.save(function (err) {
      callback(err, newApiKey);
    });
  };
  /**
   * @method User#ban
   * @param {function} callback - function(err, userSaved)
   */
  UserSchema.methods.ban = function (callback) {
    this.isBanned = true;
    this.save(callback);
  };
  /**
   * @method User#unban
   * @param {function} callback - function(err, userSaved)
   */
  UserSchema.methods.unban = function (callback) {
    this.isBanned = false;
    this.save(callback);
  };

  /**
   * @method User#notify
   * @description
   * Send notifications to this user. Note, that notifications ARE not stored in database
   * @param {string} [all] channel- channel to use for notifying users
   * @param {(object|string)} message
   * @fires Hunt#notify
   * @fires Hunt#notify:all
   * @fires Hunt#notify:email
   * @fires Hunt#notify:sio
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
     * @event Hunt#notify
     * @type {object}
     * @property {User} user - user being notified
     * @property {string} channel - name of notify channel used
     * @property {(string|object)} message
     */

    core.emit('notify', {'channel':channelToUse, 'user': this, 'message': messageToSend});

    /**
     * Emitted when any of users is notified by all channels
     *
     * @see User#notify
     * @event Hunt#notify:all
     * @type {object}
     * @property {User} user - user being notified
     * @property {(string|object)} message
     */
    core.emit('notify:' + channelToUse, {'user': this, 'message': messageToSend});
    return;
  };

  /**
   * @method User#notifyByEmail
   * @description
   * Send email notification to user
   * @param {(object|string)} message
   * @fires Hunt#notify:email
   * @returns {Boolean} - true, if some listener processed the event
   */
  UserSchema.methods.notifyByEmail = function (message) {
    if (this.keychain.email) {
    /**
     * Emitted when any of users is notified by email, and when
     * the user have email address, of course
     *
     * @see User#notifyByEmail
     * @event Hunt#notify:email
     * @type {object}
     * @property {User} user - user being notified
     * @property {(string|object)} message
     */
      core.emit('notify:email', {'user': this, 'message': message});
    }
    return;
  };
  /**
   * @method User#notifyBySocketIo
   * @description
   * Send socket.io notification to this particular user
   * @param {(object|string)} message
   * @fires Hunt#notify:sio
   * @returns {Boolean} - true, if some listener processed the event
   */
  UserSchema.methods.notifyBySocketIo = function (message) {
    /**
     * Emitted to notify any of users by socket.io
     *
     * @see User#notifyBySocketIo
     * @event Hunt#notify:sio
     * @type {object}
     * @property {User} user - user being notified
     * @property {(string|object)} message
     */
    core.emit('notify:sio', {'user': this, 'message': message});
    return;
  };


//finders
  /**
   * @method User.findOneByEmail
   * @param {string} email
   * @param {function} callback - function(err,userFound)
   */
  UserSchema.statics.findOneByEmail = function (email, callback) {
    this.findOne({'keychain.email': email}, callback);
  };
  /**
   * @method User.findOneByApiKey
   * @param {string} apiKey
   * @param {function} callback - function(err,userFound)
   */
  UserSchema.statics.findOneByApiKey = function (apiKey, callback) {
    this.findOne({'apiKey': apiKey}, callback);
  };
  /**
   * @method User.findOneByKeychain
   * @param {string} provider
   * @param {string} id
   * @param {function} callback - function(err,userFound)
   */
  UserSchema.statics.findOneByKeychain = function (provider, id, callback) {
    var key = 'keychain.' + provider,
      needle = {};
    needle[key] = id;
    this.findOne(needle, callback);
  };
  /**
   * @method User.findOneFuzzy
   * @param {string} needle
   * @param {function} callback - function(err,userFound){...}
   * @description
   * Find one user by _id, username,email, apiKey
   */
  UserSchema.statics.findOneFuzzy = function (idOrEmailOrApiKey, callback) {
    if (/^[0-9a-fA-F]{24}$/.test(idOrEmailOrApiKey)) {
      this.findById(idOrEmailOrApiKey, callback);
    } else {
      this.findOne({$or: [
        {'keychain.email': idOrEmailOrApiKey},
        {'keychain.username': idOrEmailOrApiKey},
        {'apiKey': idOrEmailOrApiKey}
      ]}, callback);
    }
  };


//local strategy (username/email and password)
  /**
   * @method User.signUp
   * @param {string} email
   * @param {string}  password
   * @param {function} callback - function(error, userSigned){}
   */
  UserSchema.statics.signUp = function (email, password, callback) {
    var User = this,
      salt = rack(),
      passwordHashed = sha512(password + salt);

    User.findOneByEmail(email, function (err, userFound) {
      if (err) {
        callback(err);
      } else {
        if (userFound) {
          callback(new Error('Email is already in use!'));
        } else {
          var newUser = new User({
            'accountVerified': false,
            'salt': salt,
            'displayName': email.split('@')[0],
            'password': passwordHashed,
            'keychain': {'email': email}
          });
          newUser.markModified('keychain');
          newUser.save(callback);
        }
      }
    });
  };
  /**
   * @method User.signIn
   * @param {string} email
   * @param {string}  password
   * @param {function} callback - function(error, userSigned){}
   */
  UserSchema.statics.signIn = function (email, password, callback) {
    this.findOneByEmail(email, function (err, userFound) {
      if (err) {
        callback(err);
      } else {
        if (userFound) {
          if (userFound.verifyPassword(password)) {
            callback(null, userFound);
          } else {
            callback(null, false);
          }
        } else {
          callback(null, false);
        }
      }
    });
  };
  /**
   * @method User.findOneByApiKeyAndVerifyEmail
   * @param {string} apiKey
   * @param {function} callback - function(error, userSigned){}
   */
  UserSchema.statics.findOneByApiKeyAndVerifyEmail = function (apiKey, callback) {
    this.findOneByApiKey(apiKey, function (err, userFound) {
      if (err) {
        callback(err);
      } else {
        if (userFound && userFound.accountVerified === false && (new Date().getTime() - userFound.apiKeyCreatedAt.getTime()) < 30 * 60 * 1000) {
          userFound.accountVerified = true;
          userFound.save(function (err1) {
            callback(err1, userFound);
          });
        } else {
          callback(new Error('Activation key is wrong or outdated!'));
        }
      }
    });
  };
  /**
   * @method User.findOneByApiKeyAndResetPassword
   * @description
   * This function is used for reseting users password by link in email with submitting form later
   * @param {string} apiKey - apiKey to use
   * @param {string} password - new password to set
   * @param {function} callback  - function(error, userFoundAndUpdated) is fired when user is saved
   */
  UserSchema.statics.findOneByApiKeyAndResetPassword = function (apiKey, password, callback) {
    this.findOneByApiKey(apiKey, function (err, userFound) {
      if (err) {
        callback(err);
      } else {
        if (userFound && (new Date().getTime() - userFound.apiKeyCreatedAt.getTime()) < 30 * 60 * 1000) {
          userFound.setPassword(password, function (err1) {
            callback(err1, userFound);
          });
        } else {
          callback(new Error('Activation key is wrong or outdated!'));
        }
      }
    });
  };

//oauth providers - twitter, facebook, github, other ones
  /**
   * @method User#setKeyChain
   * @param {string} provider - profiver name, for example - twitter, github, google
   * @param {string} id - id of user on this provider
   * @param {function} callback - function(err,userSaved)
   */
  UserSchema.methods.setKeyChain = function (provider, id, callback) {
    var thisUser = this;
    core.model.User.findOneByKeychain(provider, id, function (err, userFound) {
      if (err) {
        callback(err);
      } else {
        if (userFound) { //todo - check if this is the same user
          if(thisUser._id === userFound._id) {
            callback(null);
          } else {
            callback(new Error('This keychain pair "' + provider + '":"' + id + '" is already in use!'));
          }
        } else {
          if (!thisUser.keychain) {
            thisUser.keychain = {};
          }
          thisUser.keychain[provider] = id;
          thisUser.markModified('keychain'); //http://mongoosejs.com/docs/schematypes.html
          thisUser.save(callback);
        }
      }
    });
  };
  /**
   * @method User#revokeKeyChain
   * @param {string} provider - profiver name, for example - twitter, github, google
   * @param {function} callback - function(err,userSaved)
   */
  UserSchema.methods.revokeKeyChain = function (provider, callback) {
    this.keychain[provider] = null;
    this.markModified('keychain'); //http://mongoosejs.com/docs/schematypes.html
    this.save(callback);
  };
  /**
   * @method User.processOAuthProfile
   * @param {User} user
   * @param {object} profile
   * @param {function} callback - function(err,userAuthorized)
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
   * ```javascript
   * User1.sendMessage(User2,'hello!',function(err){if(err) throw err;});
   * //User1 sends message to User2
   * ```
   * @param {User/string} to - reciever of message
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
          'toProfile': userFound._id,
          'from': thisUser._id,
          'fromProfile': thisUser._id,
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
        core.emit('notify:pm', {
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
   * ```javascript
   * User1.sendMessage(User2,'hello!',function(err){if(err) throw err;});
   * //User1 sends message to User2
   * ```
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
          'fromProfile': userFound._id,
          'to': thisUser._id,
          'toProfile': thisUser._id,
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
        core.emit('notify:pm', {
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
    core.model.Message
      .find({'to': this._id})
      .populate('fromProfile')
      .populate('toProfile')
      .skip(messageOffset)
      .limit(messageLimit)
      .sort('-createdAt')
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
                {'to': thisUser._id, 'from': userFound._id},
                {'from': thisUser._id, 'to': userFound._id}
              ]
            })
            .populate('fromProfile') //todo - is it cached???
            .populate('toProfile')
            .limit(messageLimit)
            .skip(messageOffset)
            .sort('-createdAt')
            .exec(cb);
        } else {
          cb(new Error('User do not exists!'));
        }
      }
    ], callback);
  };

//groups
  /**
   * @method User#inviteToGroup
   * @param {string} groupName
   * @param {function} callback
   * @description
   * Invite user to group.
   */
  UserSchema.methods.inviteToGroup = function (groupName, callback) {
    var thisUser = this;
    core.model.Group.findOneAndUpdate(
      {'name': groupName}, { $addToSet: { 'members': thisUser._id } }, {'upsert': false}, function (err, group) {
        if (group) {
          core.model.User.findOneAndUpdate({'_id': thisUser._id},
            { $addToSet: { 'groups': group._id } },
            function (err, userUpdated) {
              callback(err);
            }
          );
        } else {
          callback(new Error('Group do not exists!'));
        }
      }
    );
  };
  /**
   * @method User#removeFromGroup
   * @param {string} groupName
   * @param {function} callback
   * @description
   * Remove user from group
   */
  UserSchema.methods.removeFromGroup = function (groupName, callback) {
    var thisUser = this;
    core.model.Group.findOneAndUpdate(
      {'name': groupName}, { $pull: { 'members': thisUser._id } }, {'upsert': false}, function (err, group) {
        core.model.User.findOneAndUpdate({'_id': thisUser._id}, { $pull: { 'groups': group._id } }, function (err, userUpdated) {
          callback(err);
        });
      }
    );
  };
  /**
   * @method User#hasGroup
   * @param {string} groupName
   * @param {function} callback - function(err, trueOrFalse)
   * @description
   * Verify, by callback, if user is a member of group.
   * Owner is member of group to.
   */
  UserSchema.methods.hasGroup = function (groupName, callback) {
    var thisUser = this;
    core.model.Group.findOne({'name': groupName}, function (err, groupFound) {
      if (err) {
        callback(err);
      } else {
        if (groupFound) {
          var isMember = false;
          if (groupFound.owner && groupFound.owner.toString() === thisUser._id.toString()) {
            isMember = true; //owner is member of group
          }

          groupFound.members.map(function (member) {
            if (member.toString() === thisUser._id.toString()) {
              isMember = true;
            }
            return;
          });
          callback(null, isMember);
        } else {
          callback(null, false);
        }
      }
    });
  };
  /**
   * @method User#isOwner
   * @param {string} groupName
   * @param {function} callback - function(err, trueOrFalse)
   * @description
   * Verify, by callback, if user is a owner of group.
   */
  UserSchema.methods.isOwner = function (groupName, callback) {
    var thisUser = this;
    core.model.Group.findOne({'name': groupName}, function (err, groupFound) {
      if (err) {
        callback(err);
      } else {
        if (groupFound) {
          var isOwner = false;
          if (groupFound.owner && groupFound.owner.toString() === thisUser._id.toString()) {
            isOwner = true; //owner is member of group
          }
          callback(null, isOwner);
        } else {
          callback(null, false);
        }
      }
    });
  };


  /**
   * @method User#sendMessageToGroup
   * @param {string} groupName
   * @param {string} message
   * @param {function} callback - function(err, messageCreated)
   * @description
   * Makes this user to send message in group
   */
  UserSchema.methods.sendMessageToGroup = function (groupName, message, callback) {
    var thisUser = this;
    core.model.Group.findByName(groupName, function (err, groupFound) {
      if (err) {
        callback(err);
      } else {
        if (groupFound.isMember(thisUser)) {
          core.model.GroupMessage.create({
            'group': groupFound._id,
            'from': thisUser._id,
            'fromProfile': thisUser._id,
            'message': message
          }, function (err, messageCreated) {
            groupFound.broadcast('sio', {
              'from': messageCreated.from,
              'fromProfile': thisUser.toJSON(),
              'group': groupFound.name,
              'type': 'groupChat',
              'message': messageCreated.message
            });
            callback(err, messageCreated);
          });
        } else {
          callback(new Error('User is not member of group "' + groupName + '"'));
        }
      }
    });
  };

  /**
   * @method User#getGroups
   * @param {function} callback - function(err, myGroups)
   * @description
   * Get all groups of user
   */
  UserSchema.methods.getGroups = function (callback) {
    async.map(this.groups, function (groupId, cb) {
      core.model.Group.findOne({'_id': groupId})
        .populate('owner')
        .sort('name')
        .exec(cb);
    }, callback);
  };

  return core.mongoConnection.model('User', UserSchema);
};
