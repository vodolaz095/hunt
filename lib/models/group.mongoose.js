var async = require('async');

/**
 * @class Group
 * @classdesc
 * Class that represents user groups
 * This class is ancestor of mongoose active record object, described here {@link http://mongoosejs.com/docs/documents.html},
 * {@link http://mongoosejs.com/docs/queries.html}
 *
 * @property {ObjectId} _id
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} inviteKey
 * @property {User} owner
 * @property {Array.<User>} members
 * @property {number} numberOfMembers
 *
 */

module.exports = exports = function (core) {
  var groupSchema = new core.mongoose.Schema({
      'name': {type: String, trim: true, index: true, required: true, unique: true},
      'description': String,
      'inviteKey': {type: String, index: true, required: false, sparse: true, default: core.rack },
      'owner': { type: core.mongoose.Schema.Types.ObjectId, ref: 'User' },
      'members': [
        { type: core.mongoose.Schema.Types.ObjectId, ref: 'User' }
      ]
    },
    {
      toObject: { getters: true, virtuals: true }, //http://mongoosejs.com/docs/api.html#document_Document-toObject
      toJSON: { getters: true, virtuals: true }
    }
  );

  groupSchema.index({
    name: 1,
    inviteKey: 1
  });

//when we delete the group
//removing group from  all users' accounts and
//removing group messages
  groupSchema.pre('remove', function (done) {
    var affectedUsers = this.members,
      groupId = this._id;
    if (this.owner) {
      affectedUsers.push(this.user);
    }
    async.each(affectedUsers, function (member, cb) {
      core.model.User.findOneAndUpdate({'_id': member},
        { $pull: { 'groups': groupId }},
        cb);
    }, function (err) {
      if (err) {
        done(err);
      } else {
        core.model.GroupMessage.remove({'group': groupId}, done);
      }
    });
  });

  groupSchema.virtual('numberOfMembers').get(function () {
    return this.members.length;
  });

  /**
   * @method Group.findByName
   * @param {string} name
   * @param {function} callback - function(err, groupFound)
   */
  groupSchema.statics.findByName = function (name, callback) {
    this.findOne({'name': name}, callback);
  };

  /**
   * @method Group#inviteToGroup
   * @description
   * Invite user to group
   * @param {User} user - user or apiKey,Email,id
   * @param {function} callback - function (err)
   */
  groupSchema.methods.inviteToGroup = function (user, callback) {
    user.inviteToGroup(this.name, callback);
  };

  /**
   * @method Group#removeFromGroup
   * @description
   * Remove user from group
   * @param {string/User} user - user or apiKey,Email,id
   * @param {function} callback - function (err)
   */
  groupSchema.methods.removeFromGroup = function (user, callback) {
    user.removeFromGroup(this.name, callback);
  };

  /**
   * @method Group#getMembers
   * @param  {number} limit
   * @param  {number} offset
   * @param  {function} callback
   * @description
   * Get all members of group is user's objects.
   */
  groupSchema.methods.getMembers = function (limit, offset, callback) {
    var members = this.members.slice(offset, limit);
    async.map(members, function (userId, cb) {
      core.model.User.findOne({'_id': userId}, cb);
    }, callback);
  };

  /**
   * @method Group#broadcast
   * @param {string} channel
   * @param {string} message
   * @description
   * Notify all users i this group
   */
  groupSchema.methods.broadcast = function (channel, message) {
    this.getMembers(this.members.length, 0, function (err, members) {
      if (err) {
        throw err;
      } else {
        members.map(function (member) {
          member.notify(channel, message);
        });
      }
    });
  };

  /**
   * @method Group#broadcastEmail
   * @param {string} message
   * @description
   * Notify all users in this group by email
   */
  groupSchema.methods.broadcastEmail = function (message) {
    this.getMembers(this.members.length, 0, function (err, members) {
      if (err) {
        throw err;
      } else {
        members.map(function (member) {
          member.notify('email', message);
        });
      }
    });
  };

  /**
   * @method Group#isMember
   * @param {(User|ObjectId|string)} userOrId - user object or user id
   * @return {boolean} isMember
   * @description
   * Return true, if user is in this group
   */
  groupSchema.methods.isMember = function (userOrId) {
    var isMember = false,
      id = (typeof userOrId === 'object') ? (userOrId._id) : (userOrId);

    this.members.map(function (member) {
      if (member.toString() === id.toString()) {
        isMember = true;
      }
    });
    return isMember;
  };

  /**
   * @method Group#getMessages
   * @param {number} limit
   * @param {number} skip
   * @param {function} callback - function(err, messages)
   * @description
   * Get recent messages in this group
   */
  groupSchema.methods.getMessages = function (limit, skip, callback) {
    core.model.GroupMessage
      .find({'group': this._id})
      .limit(limit)
      .skip(skip)
      .sort('-createdAt')
      .populate('fromProfile')
      .exec(callback);
  };
  return core.mongoConnection.model('Group', groupSchema);
};
