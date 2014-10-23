'use strict';

var  exphbs  = require('express-handlebars');

module.exports = exports = function (core) {
  core.app.set('views', core.config.views || './views');
  core.app.set('view engine', '.hbs');
  core.app.set('layout', 'layout');
  core.app.engine('.hbs', exphbs({defaultLayout: 'layout', extname: '.hbs'}));
  if (core.config.useAngularJSfriendlyDelimeters) {
    core.app.locals.delimiters = '[[ ]]';
  }
};
