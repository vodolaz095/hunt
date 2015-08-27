'use strict';
/*jshint expr: true*/
var should = require('should'),
  async = require('async'),
  hunt = require('./../index.js'),
  request = require('request'),
  whatWeNeed = '<!DOCTYPE html><html><head><title>Jade Example</title></head><body><h1>Users</h1><div id=\"users\"><div class=\"user\"><h2>Anatolij Ostroumov</h2><div class=\"email\">ostroumov095@gmail.com</div></div></div></body></html>';


describe('Rendering with jade', function () {
  var Hunt,
    users = [{'name':'Anatolij Ostroumov', 'email':'ostroumov095@gmail.com'}];

  before(function (done) {
    Hunt = hunt({
      'views': __dirname + '/jade-views' //directory for templates
    });

    Hunt.extendRoutes(function (core) {
      core.app.get('/', function(req, res){
        res.render('users.jade', { 'users': users });
      });
    });

    Hunt.on('start', function (evnt) {
      done();
    });
    Hunt.startWebServer(3002);
  });


  describe('it works', function () {
      var page;
      before(function (done) {
        Hunt.app.render('users.jade', { 'users': users }, function(err, html){
          if(err){
            done(err);
          } else {
            page = html;
            done();
          }
        });
      });

      describe('it can be used by Hunt.app.render', function () {
        it('exposes the Hunt.app.render function', function () {
          Hunt.app.render.should.be.a.Function;
        });

        it('renders what we need', function(){
          page.should.be.equal(whatWeNeed);
        });
      });
    });

    describe('it can be used for rendering static html pages for clients', function () {
      var page;
      before(function (done) {
        request.get('http://localhost:3002/', function (err, res, body) {
          if(err){
            done(err);
          } else {
            page = body;
            done(null);
          }
        });
      });

      it('renders what we need', function(){
        page.should.be.equal(whatWeNeed);
      });
    });

  after(function (done) {
    Hunt.stop();
    done();
  });
});
