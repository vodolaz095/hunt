HuntJS application instance is [native nodejs event emitter](http://nodejs.org/api/events.html), 
extended by [EventEmitter2](https://www.npmjs.org/package/eventemitter2).

When an EventEmitter instance experiences an error, the typical action is to emit an error event.
Error events are treated as a special case.
If there is no listener for it, then the default action is to print a stack trace and exit the program.

All EventEmitters emit the event newListener when new listeners are added.

Namespaces with Wildcards To use namespaces/wildcards, pass the wildcard option into the EventEmitter
constructor. When namespaces/wildcards are enabled, events can either be strings (`foo:bar`)
separated by a delimiter or arrays (['foo', 'bar']). The delimiter is also configurable as a constructor option.
The default delimeter is `:`

An event name passed to any event emitter listener can contain a wild card (the * character).
If the event name is a string, a wildcard may appear as foo:*.
If the event name is an array, the wildcard may appear as ['foo', '*'].

If either of the above described events were passed to the on method,
subsequent emits such as the following would be observed...

```javascript

    Hunt.emit('foo:bazz', payloadObj);
    Hunt.emit(['foo', 'bar'], payloadObj);

```

We can expose this features by utilizing the 
[observer pattern](https://en.wikipedia.org/wiki/Observer_pattern)
and, for example, add background processing to events emitted from
web application.



```javascript

    var hunt = require('hunt')({
      'views': __dirname+'/views/',
      'port': 3000
    });
    
    //react on any of traps:* events = traps:trap1, traps:trap2, traps:trap3
    hunt.once('traps:*', function(event){ 
      console.log('We catch something! But it can be false positive, so let us wait for next moves...');
    });
    
    hunt.many('traps:*',2, function(event){ //react 2 times on event
      console.log(this.event+' has something in it! Check it pls!');
    });
    
    hunt.on('traps:trap1', function(event){
      console.log('Trap1 eviscerates something in it!');
    });
    
    hunt.on('traps:trap2', function(event){
      console.log('Trap2 eviscerates something in it!');
    });
    
    hunt.on('traps:trap3', function(event){
      console.log('Trap3 eviscerates something in it!');
    });
    
    hunt.onAny(function(payload){ //react on any event!
      console.log('We catch event of '+ this.event + ' with payload of ', payload);
    });
    
    setInterval(function(){
      hunt.emit('ping','pong');
    }, 1000);
    
    hunt.on('ping', function(pong){
      if(pong !== 'pong'){
        throw new Error('There is something weird happening...');
      }
    });
    
    hunt
      .extendController('/', function (core, router) {
        router.get('/', function (req, res) {
          res.render('events', {'title': 'events', 'layout': false});
        });
      })
      .extendController('/traps', function (core, router) {
    
        router.get('/trap1', function (req, res) {
          core.emit(['traps','trap1'],'trap1 has prey in it');
          res.send('Click!');
        });
    
        router.get('/trap2', function (req, res) {
          core.emit(['traps','trap2'],'trap2 has prey in it');
          res.send('Click!');
        });
    
        router.get('/trap3', function (req, res) {
          core.emit('traps:trap3','trap3 has prey in it. Eviscerating it slowly');
          res.send('Click!');
        });
    
      })
      .startWebServer();

```


*** Utilizing events ***

This is one of possible methods to make Gamekeeper bot echoing back private messages.
Messages are created via REST interface.

```
//making Gamekeeper answering on private message

hunt.on(['REST', 'Message', 'CREATE', '*'], function (messageObj) {
  console.log('Private message', this.event, messageObj);

  if (messageObj.document.to.equals('55b0c81ee523c6a60c4325ad')) {
    console.log('Gamekeeper is thinking!');
    setTimeout(function () {
      hunt.model.Message.create({
        'to': messageObj.document.from,
        'from': '55b0c81ee523c6a60c4325ad',
        'message': [
          'On your message \"',
          messageObj.document.message,
          '\" I can answer only this: Grrrrrr!'
        ].join('')
      }, function (error, messageCreated) {
        if (error) {
          throw error;
        }
        console.log(messageCreated);
      });
    }, 1000);
  }
});
```


*** Log levels of events ***

- silly: debug information is shown
- debug: events are emitted on each http request
- verbose: users getting read access on entities
- info: users signing in, signing up, performing update/delete actions on entities 
- warn: bad configuration options
- error: webprocess and any thrown errors, that required process to be restarted 
