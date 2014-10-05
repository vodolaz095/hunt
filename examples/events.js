var hunt = require('./../index.js')({
  'views': __dirname+'/views/',
  'port': 3000
});

hunt.once('traps:*', function(event){
  console.log('We catch something! But it can be false positive, so let us wait for next moves...');
});

hunt.many('traps:*',2, function(event){
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

hunt.onAny(function(payload){
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