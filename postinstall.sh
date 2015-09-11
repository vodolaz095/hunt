#!/usr/bin/env bash

if [ "$hostUrl"="https://huntjs.herokuapp.com/" ] || [ -f herokurules.txt ]; then
# Clear old files
  rm -rf examples/public/documentation/
  rm -rf tutorials/Changelog.md -rf
  rm -rf examples/public/coverage
  rm -rf tutorials/ServerConfig.md

# Generate coverage report
  node node_modules/.bin/istanbul cover ./node_modules/.bin/_mocha

# Generate test report
  node node_modules/.bin/mocha -G --reporter markdown > tutorials/test.md

# Generate documentation
  cp CHANGELOG.md tutorials/Changelog.md
  cp examples/serverConfigsExamples/README.md tutorials/ServerConfig.md
  cp CHANGELOG.md tutorials/Changelog.md
  cp examples/serverConfigsExamples/README.md tutorials/ServerConfig.md
  node node_modules/jsdoc/jsdoc.js -c jsdoc.conf.json --pedantic -u tutorials/
  echo "Documentation generated in examples/public/documentation"

else
  echo "HuntJS installing ok!"
fi