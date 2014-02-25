#!/bin/bash
rm examples/public/documentation/ -r -f
./node_modules/.bin/jsdoc -c jsdoc.conf.json --pedantic
echo "Documentation generated in examples/public/documentation"
