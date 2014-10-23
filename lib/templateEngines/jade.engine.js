'use strict';

module.exports = exports = function (core) {
  core.app.set('views', core.config.views || './views');
  core.app.set('view engine', 'jade');
  core.app.set('layout', 'layout');
};
