#!/bin/bash
rm examples/views/documentation/ -r -f
node node_modules/jsdoc/jsdoc.js -c jsdoc.conf.json -t examples/docTemplate --pedantic
echo "Documentation generated in examples/public/documentation"
