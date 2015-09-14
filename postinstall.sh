#!/usr/bin/env bash

if [ -f herokurules.txt ]; then
# Clear old files
  rm -rf examples/public/documentation/
  rm -rf tutorials/Changelog.md -rf
  rm -rf examples/public/coverage
  rm -rf tutorials/ServerConfig.md

# Run code quality tools
 ./node_modules/.bin/jshint --verbose -c .jshintrc **/*.js

# Generate coverage report
  ./node_modules/.bin/istanbul cover ./node_modules/.bin/_mocha

# Generate test report
  ./node_modules/.bin/mocha -G --reporter markdown > tutorials/test.md

# Generate documentation
  cp CHANGELOG.md tutorials/Changelog.md
  cp examples/serverConfigsExamples/README.md tutorials/ServerConfig.md
  cp CHANGELOG.md tutorials/Changelog.md
  cp examples/serverConfigsExamples/README.md tutorials/ServerConfig.md
  node node_modules/jsdoc/jsdoc.js -c jsdoc.conf.json --pedantic -u tutorials/
  echo "Documentation generated in examples/public/documentation"
else
# It is production installation, do not run tests and generate documentation.
  echo "HuntJS installing ok!"
fi