We can use few template engines in HuntJS applications.

The default one, [Hogan.js](https://www.npmjs.com/package/hogan-express) can be used
with `.html` files being treated as templates in views directory.
It is worth notice, that [default delimeters](http://mustache.github.io/mustache.5.html#Set-Delimiter)
are `[[ ... ]]`, and not `{{ ... }}`.
This is done for compatibility with [AngularJS](https://angularjs.org/),
that use `{{ ... }}` as delimeters in views and partials. So, we can render
angularjs partials on server side, without conflicts.
Also we can use code like this `[[& yield ]]` to output variable
`as-is` without html escaping.
To use it from the box, create `someHoganJSTemplate.html` file in `views/`
directory configured by [config.views](/documentation/config.html),
and call it in code of controller.


The [Jade](https://npmjs.org/package/jade) is used for `.jade` templates.
To use it from the box, create `someJadeTemplate.jade` file in `views/`
directory configured by [config.views](/documentation/config.html), and call it in
code of controller.

The [Handelbars](https://www.npmjs.com/package/express-handlebars) templates
are used with files with extension of `hbs`. They do not offer changing default delimeters
instead of `Hogan.js`, but offers more features. To use it from the box,
create `someHandlebarsTemplate.hbs` file in `views/` directory
 configured by [config.views](/documentation/config.html),
and call it in code of controller.



```javascript


    var
      config = {
        'views': __dirname+'/views'
      },
      hunt = require('hunt')(config);

    hunt.extendController(function(core, router){

      router.get('/jade', function(request, response){
        response.render('someJadeTemplate.jade', {'title':'Jade is cool!'});
      });

      router.get('/hogan', function(request, response){
        response.render('someHoganJSTemplate', {'title':'HoganJS is cool!'});
      });

      router.get('/handlebars', function(request, response){
        response.render('someHandlebarsTemplate.hbs', {'title':'Handlebars is cool!'});
      });

    });

    hunt.startWebServer();

```