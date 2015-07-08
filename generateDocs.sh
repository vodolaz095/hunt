#!/bin/bash
rm examples/public/documentation/ -r -f
rm tutorials/Changelog.md -r -f
cp CHANGELOG.md tutorials/Changelog.md
rm tutorials/ServerConfig.md -r -f
cp examples/serverConfigsExamples/README.md tutorials/ServerConfig.md


node node_modules/jsdoc/jsdoc.js -c jsdoc.conf.json --pedantic -u tutorials/
echo "Documentation generated in examples/public/documentation"
