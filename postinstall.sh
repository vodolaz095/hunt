#!/usr/bin/env bash

if [ "$hostUrl"="https://huntjs.herokuapp.com/" ] || [ "$LOGNAME"="vodolaz095" ]; then
# Generate documentation
  rm -rf examples/public/documentation/
  rm -rf tutorials/Changelog.md -rf
  cp CHANGELOG.md tutorials/Changelog.md
  rm -rf tutorials/ServerConfig.md
  cp examples/serverConfigsExamples/README.md tutorials/ServerConfig.md

  node node_modules/jsdoc/jsdoc.js -c jsdoc.conf.json --pedantic -u tutorials/
  echo "Documentation generated in examples/public/documentation"

# Generate coverage report
  rm -rf examples/public/coverage
  node node_modules/.bin/istanbul cover ./node_modules/.bin/_mocha
else
  echo "HuntJS installing ok!"
fi