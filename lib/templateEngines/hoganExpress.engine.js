'use strict';

var hoganExpress = require('hogan-express');

module.exports = exports = function (core) {
  core.app.set('views', core.config.views || './views');
  core.app.set('view engine', 'html');
  core.app.set('layout', 'layout');
  core.app.engine('html', hoganExpress);
  if (core.config.useAngularJSfriendlyDelimeters) {
    core.app.locals.delimiters = '[[ ]]';
  }
};
