# 0.6.6
Added `bodyParserLimit` with default value of 100kb to config object - see 
[body-parser documentation](https://www.npmjs.com/package/body-parser#limit)
for details.

# v0.6.5
Newer dependencies. Improved Dockerfile.

# v0.6.4
Optimize function for signing in / signing up via oAuth providers - proper event name for creating new profile,

# v0.6.3
Newer dependencies. 
Use winston for reporting errors instead of email.
Typo fixed for accidently logging huntKeys.
Tested on NodeJS of 5.1.0 version.

# v0.6.2
More consistent error messages and REST api behaviour.
Hunt#md5, Hunt#sha512 methods.
Tested on NodeJS of 5.0.0 version.
Official `Dockerfile` provided.
Fix bug with cluster not making child process do things.
Added `canCreate` and `fieldsWritable` to display possibility of creating new entities for current user
in `exportModel` query method.
Refactoring of authorization controller.
Added `remember me` behaviour for signing in.
Improve `hunt.model.User.signup(username,email,password,callback)` function to also work with username
Each webserver process with socket.io enabled now uses 2 redis connections instead of 3.
Newer dependencies. 

# v0.6.1
Typo in default error reporter fixed.

# v0.6.0
Usage of long time support NodeJS version of 4.2.1 and NPM of 2.14.7
Newer dependencies for this NodeJS version.
Support of older nodejs version will be deprecated.

# v0.5.4
Prevent possible memleak in `hunt.mulpipart` middleware.
Newer dependencies.

# v0.5.3
Newer dependencies. 

# v0.5.2
Fix rare issue for malformed session information in redis database.

# v0.5.1
Fix issue with socket.io malfunction when we try to avoid using websockets.
Deprecate `hash` strategy - it is a part of local strategy now.
Unit tests for socket.io.
Remove old passport strategies for paypal, intuit and yahoo - they do not work due to authorization provider changes.

# v0.5.0
Deprecated `hunt.extendRoutes` and `hunt.extendMiddleware` - we have `hunt.extendController` instread.
Refactored usage of `passport.js` via `express.router`.
More recent dependencies. 
Memory leaks with loose connection sockets fixed.
Events are emited on objects manipulated by means of `exportModel`.
Greatly improved unit test structure.

# v0.4.18
Fix issue with `connect-flash` middleware not working.
Event emitted on OAuth authorization is more useful.
Script to generate documentation and test coverage on heroku.

# v0.4.17
Temporary downgrade for PassportJS to 0.2.2 version for it to work with socket.io properly.
Various fixes in `dialog` api, even if it is to be deprecated in favour of exporting the messages model.
Added `myself` boolean in exported user model to show, when we get our profile by means of
`GET /api/v1/users/{myUserId}`
More recent dependencies

# v0.4.16
Jshint integration without webstorm
Fix issues with missing check for deleting uploaded files
More recent dependencies

# v0.4.15
Added Hunt#loadModelsFromDirectory function
Added Hunt#forceHttps middleware present - see docs
Proper path to repo and issues in package.json

# v0.4.14
Updated dependencies to more recent ones

# v0.4.13
Updated dependencies to more recent ones

# v0.4.12
Fix typo with in default user's model and default user's model behaviour.
Flash message for logging out. Pretty print json on development environment.

# v0.4.11
Fix issue with `Hunt.extendTelnet` not returning `Hunt` instance
Improvements in code of example.
Updated dependencies to more recent ones. 
Fix rare race conditions in `Hunt.preload` middleware.
Improvements in documentation and tutorials.

# v0.4.9
[https://www.npmjs.com/package/validator](Validator) is exported as `hunt.validator`.

# v0.4.8
Updated dependencies to more recent ones

# v0.4.7
We can configure socket.io by via config object with this parameters all of this parameters
[https://github.com/Automattic/engine.io#methods-1](https://github.com/Automattic/engine.io#methods-1)

# v0.4.6
Updated dependencies to more recent ones

# v0.4.5
Fix rare issue with malformed user profiles in session storage.
User#email setter converts the email to lower case in all places where it is used. (Sorry for Cyrillic domains)
Break socket.io connection in Mozilla browser like described here 
[https://bugzilla.mozilla.org/show_bug.cgi?id=712329](ttps://bugzilla.mozilla.org/show_bug.cgi?id=712329)
Fix rare bug in local strategy for reseting password with malformed users account

# v0.4.4
User#notifyByEmail now have the user profile in the context of email message template.
Fix rare issue with reseting password with missing `keychain.welcomeLink`

# v0.4.3
Fix issues for sending emails with undefined callback

# v0.4.2
Fix for clearing temporary files resulted from processing uploaded files via `Hunt.multipart` middleware 

# v0.4.1
Feature - we can use hunt.emit('broadcast', message) to emit socket.io messages with different payload,
defined in `message.type`. The backward compatibility with 3.x.x branch exists.
Minor updates in dependencies

# v0.4.0
We use the Mongoose 4.x branch now. The CHANGELOG.md is created.
