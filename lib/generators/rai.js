//https://www.npmjs.org/package/rai

var RAIServer = require("rai").RAIServer;

// create a RAIServer on port 1234
var server = new RAIServer();
server.listen(1234);

// Start listening for client connections
server.on("connect", function(client){

  // Greet the client
  client.send("Hello!");

  // Wait for a command
  client.on("command", function(command, payload){

    if(command == "STATUS"){
      client.send("Status is OK!");
    }else if(command == "QUIT"){
      client.send("Goodbye");
      client.end();
    }else{
      client.send("Unknown command");
    }

  });

});