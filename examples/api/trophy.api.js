/**
 * api for restApi.js example
 */

exports.index = function(req, res){
  req.model.Trophy.find({})
    .sort('name')
    .exec(function (err, trophiesFound) {
    if (err) throw err;
    if(req.is('json')){
      res.json(trophiesFound);
    } else {
      res.render('trophy/index', {'title':'Trophies recorded','description':'Make Elders happy!','trophies':trophiesFound});
    }
  });
};

exports.new = function(req, res){
  res.render('trophy/new',{
    'title': 'Create new trophy',
    'description': 'Choose the proper one...'
  });
};

exports.create = function(req, res){
  req.model.Trophy.create({
    'name':req.body.name,
    'scored':req.body.scored
  }, function(err,trophyCreated){
    if(err){
      req.flash('error', err.toString());
    } else {
      req.flash('success', 'Trophy #' + trophyCreated.name + ' created!');
    }
    res.redirect('/');
  });
};

exports.show = function(req, res){
  req.model.Trophy.findById(req.params.trophy, function (err, trophy) {
    if (err) throw err;
    if(req.is('json')){
      if(trophy){
        res.json(trophy);
      } else {
        res.send(404);
      }
    } else {
      if(trophy){
        res.render('trophy/show', {
          'title': trophy.name,
          'description': 'Edit trophy',
          'trophy': trophy
        });
      } else {
        res.send(404);
      }
    }
  });
};

exports.edit = function(req, res){
  req.model.Trophy.findById(req.params.trophy, function (err, trophy) {
    if (err) throw err;
    if(req.is('json')){
      if(trophy){
        res.json(trophy);
      } else {
        res.send(404);
      }
    } else {
      if(trophy){
        res.render('trophy/edit', {'title': trophy.name, 'trophy': trophy});
      } else {
        res.send(404);
      }
    }
  });

};

exports.update = function(req, res){
  req.model.Trophy.findOneAndUpdate(
    {
      '_id':req.params.trophy
    },
    {
      'name':req.body.name,
      'scored':req.body.scored
    },
    function(err, trophyUpdated){
      if(err){
        req.flash('error',err.toString());
        res.redirect('back');
      } else {
        if(trophyUpdated){
          req.flash('success', 'Trophy updated!');
          res.redirect('/'+trophyUpdated.id);
        } else {
          req.flash('error', 'Unable to edit trophy... It is lost?');
          res.redirect('back');
        }
      }
    });
};

exports.destroy = function(req, res){
  req.model.Trophy.remove({'_id':req.params.trophy}, function(err){
    if(err){
      req.flash('error',err.toString());
    } else {
      req.flash('info','Trophy removed!');
    }
    res.redirect('/trophies');
  });
};
