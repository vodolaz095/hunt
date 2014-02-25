var socket = io.connect('', {
  'connect timeout': 1000
});

socket.on('broadcast', function (data) {
  if (data.time) {
    document.getElementById('clock').innerHTML = data.time;
  }
});
