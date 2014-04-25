//GET /groups/
exports.index = function(request, response){
  request.model.Group
    .find()
    .populate('owner')
    .populate('members')
    .limit(100)
    .exec(function(error, groups){
      response.render('chats',{
        'title':'Chat groups',
        'groups':groups
      });
    });
};

//GET /groups/new
exports.new = function(request, response){
  response.redirect('/groups');
};

//POST /groups
exports.create = function(request, response){
  if(request.user){
    if(request.body.groupName){
      request.user.createMyGroup(request.body.groupName, function(error, group){
        if(error){
          throw error;
        } else {
          request.flash('success','Group created!');
          response.redirect('/groups/'+group.id);
        }
      });
    } else {
      response.send(400);
    }
  } else {
    request.flash('error','Please, authorize!');
    response.redirect('/auth/login');
  }
};

//GET /groups/:group
exports.show = function(request, response){
  response.send('ok!');
};

//GET /groups/:group/edit
exports.edit = function(request, response){
  response.send('ok!');
};

//PUT /groups/:group/
exports.update = function(request, response){
  response.send('ok!');
};

//DELETE /groups/:group/
exports.destroy = function(request, response){
  response.send('ok!');
};