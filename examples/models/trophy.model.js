module.exports = exports = function(core){
  var TrophySchema = new core.mongoose.Schema({
    'name': {type: String, unique: true},
    'scored': Boolean
  });

  TrophySchema.index({
    name: 1
  });
//this step is very important - bind mongoose model to current mongo database connection
// and assign it to collection in mongo database
  return core.mongoConnection.model('Trophy', TrophySchema);
};