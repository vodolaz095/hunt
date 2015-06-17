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
