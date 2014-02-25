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
        '<td><a href="http://who.is/whois-ip/ip-address/'+data.httpSuccess.ip+'"></a>'+data.httpSuccess.ip+'</td>'+
        '<td>'+data.httpSuccess.method+'</td>' +
        '<td><a href="'+data.httpSuccess.uri+'">'+data.httpSuccess.uri+'</a></td>' +
        '<td>'+data.httpSuccess.statusCode+'</td>' +
        '<td>'+data.httpSuccess.user+'</td>' +
        '</tr>');
  }
});
