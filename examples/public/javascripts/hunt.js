/*
 * This scripts shows how we can work with socket.io
 * notifications sendby Hunt framework.
 */
var socket = io.connect('', {
  'connect timeout': 1000
});

var model = {
  'clock': ko.observable(),
  'recentVisits': ko.observableArray(),
  'pingerUrl': ko.observable(),
  'pingerAnswer': ko.observable('Enter URL'),
  'sioMessage': ko.observable(),
  'sendSioMessage': function () {
    var that = this;
    socket.send(that.sioMessage(), function (error) {
      if (error) {
        throw error;
      }
      that.sioMessage('');
    });
  },
  'flash': {
    'error': ko.observableArray(),
    'info': ko.observableArray(),
    'success': ko.observableArray()
  },
  'points': ko.observableArray()
};

model.pingerUrl.subscribe(function(newUrl){
  if(newUrl){
    socket.emit('pingerUrl', newUrl);
  } else {
    model.pingerAnswer('Enter URL...');
  }
});

ko.applyBindings(model);

//socket.io event for pinger
socket.on('pingerAnswer', model.pingerAnswer);

//socket.io events, delivered to all users online
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

  if(data.positionUpdate){
    var removed = false;
    model.points.remove(function(item) {
      if(item.id == data.positionUpdate.id){
        removed = true;
        return true;
      } else {
        return false;
      }
    });

    model.points.push(data.positionUpdate);

  }
});

var doTrack = true, x, y;

setInterval(function(){
  if(doTrack){
    socket.emit('position', {
      'x':x,
      'y':y
    });
  }
}, 800);

function getPosition(event){
  x=event.clientX;
  y=event.clientY;
  doTrack = true;
}

function stopTracking(){
  doTrack = false;
}

function toggleTracking(){
  //doTrack = ! doTrack;
}

function loadPoints(){
  $.get('/api/map.json', function(data){
//    console.log(data);
//    var dataProcessed = JSON.parse(data);
//    console.log(dataProcessed);
    data.map(function(point){
      model.points.push(point);
    });
  });
}