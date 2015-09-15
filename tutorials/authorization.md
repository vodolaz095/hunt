We can authorize users in few ways using [passport.js](http://passportjs.org) powered sessions.
Initial configuration can be done via [passport](/documentation/passport.html)
property of [config](/documentation/config.html) object.

***Local strategy***
Will be explained shortly

***Sign up and email confirmation***
Will be explained shortly

***Header authorization***
We can pass authorization token (the [huntKey](/documentation/User.html#.findOneByHuntKey))
as header for requests and if there is no `passport.js` authorized user, the authorization is done.

***Token authorization***
We can pass authorization token (the [huntKey](/documentation/User.html#.findOneByHuntKey))
as query (for `GET` ) or body parameter (for `POST`,`PUT`,`PATCH`,`DELETE`) for requests
and if there is no `passport.js` authorized user, the authorization is done.
For example, [/api/v1/myself?huntKey=i_am_game_master_grr](/api/v1/myself?huntKey=i_am_game_master_grr)

***Default OpenID strategies***
Currently we have this ones:

- [yahoo](/auth/yahoo)
- [steam](/auth/steam) 	
- [paypal](/auth/paypal) 	
- [intuit](/auth/intuit)

***Default OAuth strategies***
Currently we have this ones:

- [Google](/auth/google)
- [VK](/auth/vk)
- [Github](/auth/github) 	
- [Twitter](/auth/twitter) 	
- [Facebook](/auth/facebook)




