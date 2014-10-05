Telnet application example
=========================================

```javascript

    var Hunt = require('./../index.js'),
      config = {
        'port': 3000,
        'telnetServer': {
          'debug': true
        }
      };
    
    var hunt = Hunt(config);
    
    hunt.once('start', function (event) {
      console.log('Now you can connect to hunjs application with telnet \n $ telnet localhost ' + event.port);
    });
    
    hunt
      .extendTelnet('hi', function (core, client, payload) { //process the 'hi' telnet command
        client.send('HuntJS application of version ' + core.version + ' greets you!');
        console.log(payload);
    
        if (payload.toString() != '') {
          client.send('Your payload for this command is ' + payload);
        }
    
        setTimeout(function () {
          client.send('Server is tired. Sorry.'); // :-)
          client.end();
        }, 10000);
      })
      .startTelnetServer();

```


Explanation
======================================


1) [Full list of configuration options](/documentation/config.html)

2) [extendTelnet documentation](/documentation/Hunt.html#extendTelnet)

3) [Documentation about telnet server options](https://www.npmjs.org/package/rai)

4) [startTelnetServer](/documentation/Hunt.html#startTelnetServer)

