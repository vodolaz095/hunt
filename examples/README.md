HuntJS examples folder
====================

**api/**
Files used by `restApi.js` example.

**docTemplate/**
Template for documentation - do not touch!

**lib/**
Script to populate database with test data, when application is started.

**models/**
[Mongoose ORM](http://mongoosejs.com/) models used by `restApi.js` and `fullExample.js`

**public/**
Client side css, javascripts and some static files, used by examples.

**serverConfigsExamples/**
[NGINX](http://nginx.com/), [Pound](http://www.apsis.ch/pound), firewall
and [SystemD](http://www.freedesktop.org/wiki/Software/systemd/) configuration examples.

**autorizationAndUserProfile.js**
Example to show authorization by means of passport.js framework with different strategies,
sign up/sign in and profile merging.

**clock.js**
Example, that demonstrates the use of HuntJS as event emitter and shows page with real time clock,
that is powered by [socket.io](http://socket.io/) backend and

**cluster.js**
This example demonstrates how unbreakable HuntJS application can be, with help of
[nodejs cluster](http://nodejs.org/docs/latest/api/cluster.html)

**dialog.js**


**fullExample.js**
Mix of all examples

**helloworld.js**
The ultimate example.

**listAllUsers.js**
Console script to list all users in current mongo database

**restApi.js**
Simple rest api example

**telnet.js**
Simple [telnet](https://en.wikipedia.org/wiki/Telnet) server, user can login, send some commands via the `telnet` command

**usersOnline.js**
Example, that streams, by means of [socket.io](http://socket.io/), information on recent http requests, processed
by HuntJS application
