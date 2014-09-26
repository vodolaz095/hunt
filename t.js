'use strict';
var hunt = require('./index.js')();
hunt.extendCore('a', 'b');
console.log('hunt.a=', hunt.a);

hunt.on('ping', function (msg, msg1) {
  console.log('+++ping+++', this.event, msg, msg1, '+++ping+++');
});

hunt.on('ping:2', function (msg, msg1) {
  console.log('+++ping:2+++', this.event, msg, msg1, '+++ping:2+++');
});

hunt.on('ping:*', function (msg, msg1) {
  console.log('+++ping:*+++', this.event, msg, msg1, '+++ping:*+++');
});


hunt.once('start', function (type) {
  console.log('Starting to send events...');
  hunt.emit(['ping', '2'], 'pong', 'lll');
});
hunt.startBackGround();
