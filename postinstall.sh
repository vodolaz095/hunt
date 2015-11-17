#!/usr/bin/env bash

if [ -f herokurules.txt ]; then
# Clear old files
  rm -rf examples/public/documentation/
  rm -rf tutorials/Changelog.md -rf
  rm -rf examples/public/coverage
  rm -rf tutorials/ServerConfig.md

# Run code quality tools
  ./node_modules/.bin/jshint --verbose --show-non-errors -c .jshintrc .

# Generate coverage report
  echo "We are generating coverage report..."
  ./node_modules/.bin/istanbul cover ./node_modules/.bin/_mocha
  echo "We have generated coverage report!"

# Generate test report
  echo "We are generating test report..."
  ./node_modules/.bin/mocha -G --reporter markdown > tutorials/test.md
  echo "We have generated test report!"

# Generate documentation
  echo "We are generating documentation..."
  cp CHANGELOG.md tutorials/Changelog.md
  cp examples/serverConfigsExamples/README.md tutorials/ServerConfig.md
  cp CHANGELOG.md tutorials/Changelog.md
  cp examples/serverConfigsExamples/README.md tutorials/ServerConfig.md
  node node_modules/jsdoc/jsdoc.js -c jsdoc.conf.json --pedantic -u tutorials/
  echo "We have generated documentation!"

# Build frontend code
  echo "We are generating frontend..."
  ./node_modules/.bin/gulp
  echo "We have generated frontend!"
else
# It is production installation, do not run tests and generate documentation.
  echo "HuntJS installing ok!"
fi