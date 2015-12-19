'use strict';

var
  gulp = require('gulp'),
  less = require('gulp-less'),
  bower = require('gulp-bower'),
  gulpFilter = require('gulp-filter'),
  minifycss = require('gulp-minify-css'),
  uglify = require('gulp-uglify'),
  mainBowerFiles = require('main-bower-files'),
  rename = require('gulp-rename'),
  concat = require('gulp-concat'),
  order = require('gulp-order'),
  del = require('del'),
  jsFilter = gulpFilter('*.js'),
  cssFilter = gulpFilter('*.less'),
  dest = 'examples/public/dist';

gulp.task('clean', function (cb) {
  return del(['examples/public/dist/*.js', 'examples/public/dist/*.css'], cb);
});

gulp.task('bower', function () {
  return bower();
});

gulp.task('vendor-js', function () {
  return gulp.src(mainBowerFiles())
    .pipe(jsFilter)
    .pipe(concat('vendor.js'))
    .pipe(gulp.dest(dest))
    .pipe(rename({suffix: '.min'}))
    .pipe(uglify())
    .pipe(gulp.dest(dest));
});

gulp.task('vendor-css', function () {
  return gulp.src(mainBowerFiles())
    .pipe(cssFilter)
    .pipe(less())
    .pipe(concat('vendor.css'))
    .pipe(gulp.dest(dest))
    .pipe(minifycss())
    .pipe(rename({suffix: '.min'}))
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
    .pipe(gulp.dest(dest));
});

////http://stackoverflow.com/questions/26273358/gulp-minify-all-css-files-to-a-single-file
gulp.task('styles', function () {
  gulp.src(['public/**/*.css'])
    .pipe(concat('huntjs.css'))
    .pipe(gulp.dest(dest))
    .pipe(minifycss())
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest(dest));
});

gulp.task('vendor', ['bower'], function () {
  gulp.start('vendor-js', 'vendor-css');
});

gulp.task('default', ['clean'], function () {
  gulp.start('vendor', 'scripts', 'styles');
});

