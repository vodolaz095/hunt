var hunt = require('./../index.js'),
  config = {
    'port':3000,
    'telnetServer':{
      'debug': true
    }
  };

var Hunt = hunt(config);

Hunt.extendTelnet('hi', function(core, client, payload){
  client.send('HuntJS application of version '+core.version+' greets you!');
  console.log(payload);

  if(payload.toString() != ''){
    client.send('Your payload for this command is '+ payload);
  }
//*/
  setTimeout(function(){
    client.send('Server is tired. Sorry.'); // :-)
    client.end();
  }, 10000);
//*/
});

Hunt.startTelnetServer();

Hunt.on('start', function(event){
  console.log('Now you can connect to hunjs application with telnet \n $ telnet localhost '+event.port);
});

