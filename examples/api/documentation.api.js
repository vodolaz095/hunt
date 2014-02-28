var fs = require('fs');

exports.index = function(request, response){
  response.redirect('/documentation/index.html');
}

exports.article = function(request, response){
  var articleName = request.params[0],
    path = __dirname+'/../views/documentation/'+articleName+'.html';
  console.log(articleName);
  console.log(path);
  fs.exists(path, function(exists){
      if(exists){
        response.render('documentation/'+articleName ,{
          'title': articleName
        });
      } else {
        response.send(404);
      }
    });

}