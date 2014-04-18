/*
 * This file helps to load CSS and client-side javascripts
 * for every HuntJS example
 */
module.exports = exports = function(core){
  core.app.locals.css.push({'href': '//yandex.st/bootstrap/3.1.1/css/bootstrap.min.css', 'media': 'screen'});

  core.app.locals.javascripts.push({'url': '//yandex.st/jquery/2.0.3/jquery.min.js'});
  core.app.locals.javascripts.push({'url':'//yandex.st/bootstrap/3.1.1/js/bootstrap.min.js'});
  core.app.locals.javascripts.push({'url':'//cdnjs.cloudflare.com/ajax/libs/knockout/3.1.0/knockout-min.js'});
  core.app.locals.javascripts.push({'url': '/javascripts/hunt.js'});
};