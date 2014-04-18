var request = require('http').request,
  url = require('url');

//socket.io listener to issue ping requests


function isUrl(payload){
  if(typeof payload === 'string'){
    var parameters = url.parse(payload);
      if(parameters.protocol === 'http:' || parameters.protocol === 'https:' ){
        return parameters;
      } else {
        return false;
      }
  } else {
    return false;
  }
}

module.exports = exports = function(payload, socket){
  var a = isUrl(payload);
  if(a){
    socket.emit('pingerAnswer', 'Trying to ping '+a.href+'...');
    var req = request({'method':'HEAD', 'hostname': a.hostname, 'port':a.port }, function(response){
      socket.emit('pingerAnswer', a.href+' - statusCode '+response.statusCode);
    });
    req.on('error', function(error){
      socket.emit('pingerAnswer','Error! '+error.toString());
    });
    req.end();
  } else {
    socket.emit('pingerAnswer','Error! Unable to parse URL!');
  }
};