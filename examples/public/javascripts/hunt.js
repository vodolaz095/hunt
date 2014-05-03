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
  'points': ko.observableArray(),

  'dialogTo': ko.observable(),
  'messages': ko.observableArray(),
  'dialogDraftMessage':ko.observable(),
  'dialogSendMessage': function() {
      var m = this;
      socket.emit(
        'dialog',
        { 'to': m.dialogTo(), 'message': m.dialogDraftMessage() },
        function(result){
          if(result.error){
            m.flash.error.push(result.error);
            return;
          }
          if(result.success){
            m.flash.success.push('Message #'+result.success+' is delivered!');
            m.dialogDraftMessage('');
            return;
          }
          console.log(result);
        }
      );
  },

  'groupChat': ko.observable(),
  'groupChatDraftMessage':ko.observable(),
  'groupChatSendMessage': function() {
      var m = this;
      socket.emit(
        'groupchat',
        { 'groupchat': m.to(), 'message': m.groupChatDraftMessage() },
        function(result){
          if(result.error){
            m.flash.error.push(result.error);
            return;
          }
          if(result.success){
            m.flash.success.push('Message #'+result.success+' is delivered!');
            m.groupChatDraftMessage('');
            return;
          }
          console.log(result);
        }
      );
  }

};

model.pingerUrl.subscribe(function(newUrl){
  if(newUrl){
    socket.emit('pingerUrl', newUrl);
  } else {
    model.pingerAnswer('Enter URL...');
  }
});


//socket.io event for pinger
socket.on('pingerAnswer', model.pingerAnswer);

//socket.io event for private message
socket.on('dialog', function(message){
  console.log(message);
});

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

window.onhashchange = function(evnt){
  if(location.hash === '#!inbox'){
    $.get('/api/dialog', function(data){
      model.dialogMessages.removeAll()
      data.map(function(privateMessage){
        model.messages.push(privateMessage);
      });
    });
    return;
  }

  if(location.hash === '#!clients'){
    $.get('/api/allUsers', function(data){

    });
  }

  var ids = /^\#\!user([0-9a-fA-F]{2})$/.exec(location.hash);
  if(Array.isArray(ids) && ids[1]){
    model.dialogTo(ids[1]);
    $.get('/api/dialog/'+ids[1], function(data){
      model.dialogMessages.removeAll()
      data.map(function(privateMessage){
        model.messages.push(privateMessage);
      });
    });
  }

};

ko.applyBindings(model);