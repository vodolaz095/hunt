'use strict';

//todo - try to improve it
function isSequilize(model) {
  return (typeof model.name === 'string' && typeof model.tableName === 'string');
}

//todo - try to improve it
function isMongoose(model) {
  if (typeof model === 'function') {
    if (model.base.Mongoose) {
      return true;
    }
  }
  return false;
}

exports.find = function (model, parameters, callback) {
  if (isSequilize(model)) {
    console.log(parameters);

    return model
      .find({
        where: {},
        limit: parameters.limit,
        offset: parameters.skip,
        order: parameters.sort || 'id DESC',
      })
      .then(function (itemsFound) {
        callback(null, itemsFound);
      }, callback);
  }

  if (isMongoose(model)) {
    return model
      .find(parameters.filter)
      .skip(parameters.skip)
      .limit(parameters.limit)
      .sort(parameters.sort || '-_id')
      .exec(function (error, itemsFound) {
        callback(error, itemsFound);
      });
  }
  return callback(new Error('Unknown type of model for calling `find`!'));
};

exports.count = function (model, parameters, callback) {
  if (isSequilize(model)) {
    return model
      .count({
        where: {}
        //limit: parameters.limit,
        //offset: parameters.skip,
        //order: parameters.sort,
      })
      .then(function (itemsFound) {
        callback(null, itemsFound);
      }, callback);
  }

  if (isMongoose(model)) {
    return model
      .count(parameters.filter)
      //.skip(parameters.skip)
      //.limit(parameters.limit)
      //.sort(parameters.sort)
      .exec(function (error, itemsFound) {
        callback(error, itemsFound);
      });
  }
  return callback(new Error('Unknown type of model for calling `find`!'));
};

exports.findById = function (model, id, callback) {
  if (isSequilize(model)) {
    return model.findById(id).then(function (itemFound) {
      callback(null, itemFound);
    }, callback);
  }
  if (isMongoose(model)) {
    return model.findById(id).exec(function (error, itemFound) {
      callback(error, itemFound);
    });
  }
  return callback(new Error('Unknown type of model for calling `findById`!'));
};

exports.save = function (model, instance, callback) {
  if (isSequilize(model) || isMongoose(model)) {
    return instance.save().then(function () {
      callback(null);
    }, callback);
  }
  return callback(new Error('Unknown type of model for calling `findById`!'));
};

exports.delete = function (model, instance, callback) {
  if (isSequilize(model)) {
    instance.destroy().then(function () {
      callback(null);
    }, callback);
  }
  if (isMongoose(model)) {
    return instance.remove(function (error) {
      callback(error);
    });
  }
  return callback(new Error('Unknown type of model for calling `findById`!'));
};

exports.isSequilize = isSequilize;
exports.isMongoose = isMongoose;
