var request = require('request'),
  url = require('url');

//socket.io listener to issue ping requests


function isUrl(payload){
  if(typeof payload === 'string'){
    var parameters = url.parse(payload);
      if(parameters.protocol === 'http:' || parameters.protocol === 'https:' ){
        return payload;
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
    socket.emit('pingerAnswer', 'Trying to ping '+a+'...');
    request.head(a, function(error, response, body){
      if(error){
        socket.emit('pingerAnswer','Error! '+error.toString());
      } else {
        socket.emit('pingerAnswer', a+' - statusCode '+response.statusCode);
      }
    });
  } else {
    socket.emit('pingerAnswer','Error! Unable to parse URL!');
  }
};