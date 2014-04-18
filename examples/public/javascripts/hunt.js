/*
 * This scripts shows how we can work with socket.io
 * notifications sendby Hunt framework.
 */
var socket = io.connect('', {
  'connect timeout': 1000
});

var model = {
  'clock': ko.observable(),
  'recentVisits': ko.observableArray()
}
ko.applyBindings(model);

socket.on('broadcast', function (data) {
//  console.log(data);
  if (data.time) {
    model.clock(data.time);
  }

  if(data.httpSuccess){
    model.recentVisits.push(data.httpSuccess);
  }

  if(data.notification){
    console.log(data);
  }
});

if($('input #sioNumber')){

  setInterval(function(){
    socket.emit('sioNumber', $('#sioNumber').val());
  }, 200);

  socket.on('sioAnswer', function(value){
   $('#sioAnswer').val(value);
  });
}

$('#sioMessage button').click(function(){
  var message = $('#sioMessage input').val();
  socket.send(message,function(error){
    if(error){
      console.error(error);
    } else {
      $('#sioMessage input').val('');
    }
  });
});
