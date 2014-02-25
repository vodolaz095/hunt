var socket = io.connect('', {
  'connect timeout': 1000
});

socket.on('broadcast', function (data) {
  document.getElementById('displayName').innerHTML = data.displayName;
  document.getElementById('ip').innerHTML = data.ip;
  document.getElementById('method').innerHTML = data.method;
  document.getElementById('uri').innerHTML = data.uri;
  document.getElementById('statusCode').innerHTML = data.statusCode;
});