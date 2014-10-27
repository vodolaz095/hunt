Profiling in HuntJS
============================================

There is a way to profile database interactions in Huntjs by observing events emitted in namespace of
`profiling:*`


##Events and namespaces
HuntJS uses the [Event Emitter2](https://www.npmjs.org/package/eventemitter2) to help catching the event needed.
You can see broad description of [this in tutorial of events](/documentation/tutorial-events.html)


##Profiling the redis database
There are events emitted on every redis command. Namespace is `profiling:redis:*` with namespaces consisted of redis command names and arguments' values

```javascript

    var Hunt  = require('hunt')({
      //some config options
    });

    function listener(payload){
      console.log('We received event '+this.event+' with payload', payload);
    }

    //All this listeners will be fired on
    //redis command `set someKeyName someKeyValue`

    Hunt.on('profiling:*', listener);
    Hunt.on('profiling:redis:*', listener);
    Hunt.on('profiling:redis:set:*', listener);
    Hunt.on('profiling:redis:set:someKeyName:*', listener);
    Hunt.on('profiling:redis:set:someKeyName:someKeyValue', listener);
    Hunt.on('start', function(){
      Hunt.redisClient.set('someKeyName','someKeyValue');
    });
    Hunt.startBackground();

```


##Profiling the Mongo database

```javascript

    var Hunt  = require('hunt')({
      //some config options
    });

    function listener(payload){
      console.log('We received event '+this.event+' with payload', payload);
    }

    //All this listeners will be fired on
    //when mongoose initialize collection of `users` in `hunt_dev` database

    Hunt.on('profiling:*', listener);
    Hunt.on('profiling:mongoose:*', listener);
    Hunt.on('profiling:mongoose:hunt_dev:*', listener);
    Hunt.on('profiling:mongoose:hunt_dev:users:*', listener);
    Hunt.on('profiling:mongoose:hunt_dev:users:ensureIndex', listener);
    Hunt.on('profiling:mongoose:hunt_dev:users:find:*', listener);
    Hunt.on('profiling:mongoose:hunt_dev:users:find:toArray', listener);
    Hunt.startBackground();

```

##Profiling the Sequilize
Will be done shortly
