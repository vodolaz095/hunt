'use strict';

var swig = require('swig');

module.exports = exports = function (core) {
  core.app.set('views', core.config.views || './views');
  core.app.set('view engine', 'html');
  core.app.set('layout', 'layout');
  core.app.engine('html', swig.renderFile);
};
