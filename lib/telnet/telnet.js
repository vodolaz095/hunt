'use strict';

var basicCommands = require('./telnetBasicCommands.js');

module.exports = exports = function (core) {
  var y, z;
  return function (client) {
    client.send('Hello from HuntJS powered telnet server!');
    client.send('When a client sends something to the server,');
    client.send('the first word of the line is treated as ');
    client.send('a command and the rest of the line as binary payload.');
    client.send('Available commands:');
    for (y in basicCommands) {
      if (basicCommands.hasOwnProperty(y)) {
        client.send(' > ' + y + ' < ');
      }
    }
    for (z in core.extendedCommands) {
      if (core.extendedCommands.hasOwnProperty(z)) {
        client.send(' > ' + z + ' < ');
      }
    }
    client.send('Ready for your commands!\n');
    client.on('command', function (command, payload) {
      command = command.toLowerCase();
      if (typeof core.extendedCommands[command] === 'function') {
        core.extendedCommands[command](core, client, payload);
      } else {
        if (typeof basicCommands[command] === 'function') {
          //client.send('Trying to execute "'+command+'"...')
          basicCommands[command](core, client, payload);
        } else {
          client.send('Sorry, i do not know how to do "' + command + '"!');
        }
      }
    });
  };
};