Profiling in HuntJS
============================================

There is a way to profile database interactions in Huntjs by observing events emitted in namespace of
`profiling:*`


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


##Profiling the Sequilize
Will be done shortly
