test: check

install:
	npm install

check:
	npm test

clearDocs:
	rm -rf examples/public/documentation/
	rm -rf tutorials/Changelog.md -rf
	rm -rf examples/public/coverage
	rm -rf tutorials/ServerConfig.md

jshint:
	npm run-script jshint

jslint:
	npm run-script jslint

frontend:
	npm run-script frontend

docs:
	cp CHANGELOG.md tutorials/Changelog.md
	cp examples/serverConfigsExamples/README.md tutorials/ServerConfig.md
	cp CHANGELOG.md tutorials/Changelog.md
	cp examples/serverConfigsExamples/README.md tutorials/ServerConfig.md
	node node_modules/jsdoc/jsdoc.js -c jsdoc.conf.json --pedantic -u tutorials/


