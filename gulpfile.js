'use strict';

var
  gulp = require('gulp'),
  debug = require('gulp-debug'),
  less = require('gulp-less'),
  bower = require('gulp-bower'),
  minifycss = require('gulp-minify-css'),
  uglify = require('gulp-uglify'),
  rename = require('gulp-rename'),
  concat = require('gulp-concat'),
  order = require('gulp-order'),
  del = require('del'),
  dest = 'examples/public/dist';

gulp.task('clean', function (cb) {
  return del(['examples/public/dist/*.js', 'examples/public/dist/*.css'], cb);
});

gulp.task('bower', function () {
  return bower();
});

gulp.task('vendor-js', function () {
  return gulp.src([
    'bower_components/async/dist/async.js',
    'bower_components/jquery/dist/jquery.js',
    'bower_components/angular/angular.js',
    'bower_components/angular-route/angular-route.js',
    'bower_components/bootstrap/dist/js/bootstrap.js',
    'bower_components/socket.io.client/dist/socket.io-1.3.5.js'
  ])
    .pipe(debug({title: 'Vendor JS to use:'}))
    .pipe(concat('vendor.js'))
    .pipe(gulp.dest(dest))
    .pipe(rename({suffix: '.min'}))
    .pipe(uglify())
    .pipe(debug({title: 'minified vendor JS:'}))
    .pipe(gulp.dest(dest));
});

gulp.task('vendor-css', function () {
  return gulp.src([
    'bower_components/bootstrap/dist/css/bootstrap.css'
  ])
    .pipe(less())
    .pipe(concat('vendor.css'))
    .pipe(gulp.dest(dest))
    .pipe(minifycss())
    .pipe(rename({suffix: '.min'}))
    .pipe(debug({title: 'minified CSS:'}))
    .pipe(gulp.dest(dest));
});

gulp.task('scripts', function () {
  return gulp.src('examples/public/*.ng.js')
    .pipe(order([
      'hunt.ng.js',
      'app.ng.js'
    ]))
    .pipe(concat('huntjs.js'))
    .pipe(gulp.dest(dest))
    .pipe(rename({suffix: '.min'}))
    .pipe(uglify())
    .pipe(debug({title: 'minified JS:'}))
    .pipe(gulp.dest(dest));
});

////http://stackoverflow.com/questions/26273358/gulp-minify-all-css-files-to-a-single-file
gulp.task('styles', function () {
  return gulp.src(['public/**/*.css'])
    .pipe(concat('huntjs.css'))
    .pipe(gulp.dest(dest))
    .pipe(minifycss())
    .pipe(rename({suffix: '.min'}))
    .pipe(debug({title: 'minified CSS:'}))
    .pipe(gulp.dest(dest));
});

gulp.task('vendor', ['bower'], function () {
  return gulp.start('vendor-js', 'vendor-css');
});

gulp.task('default', ['clean'], function () {
  return gulp.start('vendor', 'scripts', 'styles');
});

