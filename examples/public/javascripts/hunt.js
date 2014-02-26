/*
 * This scripts shows how we can work with socket.io
 * notifications sendby Hunt framework.
 */
var socket = io.connect('', {
  'connect timeout': 1000
});

socket.on('broadcast', function (data) {
//  console.log(data);
  if (data.time) {
    document.getElementById('clock').innerHTML = data.time;
  }

  if(data.httpSuccess){
    console.log(data);
    $('#recentVisits tbody').append(
      '<tr>' +
        '<td><a href="http://who.is/whois-ip/ip-address/'+data.httpSuccess.ip+'">'+data.httpSuccess.ip+'</a></td>'+
        '<td>'+data.httpSuccess.method+'</td>' +
        '<td><a href="'+data.httpSuccess.uri+'">'+data.httpSuccess.uri+'</a></td>' +
        '<td>'+data.httpSuccess.statusCode+'</td>' +
        '<td>'+ (data.httpSuccess.user ? ( '<a href="/dialog/'+data.httpSuccess.user.id+'">'+data.httpSuccess.user.displayName+'</a>'): 'Anonymous')+'</td>' +
        '</tr>');
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
