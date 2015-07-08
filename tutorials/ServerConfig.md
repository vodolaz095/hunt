Various configuration examples to run huntJS applications
==================================

This folders contains config files for any 3rd party programs,
that are used to run nodejs applications build on Hunt.js

Main idea behind this is to allow Hunt.js application to be ran on behalf
of limited user account. This is more save, than running hunt.js applications
as root user, but it prevents us from listening on ports with numbers greater
than 1000 - because on Linux only root user can run applications that listens
on standard ports of 80 and 443.

We assume you have Linux machine.

[firewall.sh](https://github.com/vodolaz095/hunt/blob/master/examples/serverConfigsExamples/firewall.sh)
==================================

Shell script to properly setup the firewall - open 22, 80, 443 port

[pound.cfg](https://github.com/vodolaz095/hunt/blob/master/examples/serverConfigsExamples/pound.cfg)
==================================

Configuration file for [Pound reverse proxy and load balancer](http://www.apsis.ch/pound).
So, we can run the Pound service as root on 80 port as http server, and on 443 port
as https server, with http backend on port 3000, that is a hunt application, ran
on behalf of user with limited account.
The strong sides of this approach is very high security and performance of
Pound, and the bad side is issues with websockets connectivity in socket.io module.

[nginx.conf](https://github.com/vodolaz095/hunt/blob/master/examples/serverConfigsExamples/nginx.conf)
==================================

Configuration file for [nginx web server and reverse proxy](http://nginx.org/).
So, we can run the Nginx service as root on 80 port as http server, and on 443 port
as https server, with http backend on port 3000, that is a hunt application, ran
on behalf of user with limited account. Also we serve static assets from `public/`
directory of hunt.js application by the means of nginx.
Also the websockets are supported

[huntjs@.service](https://github.com/vodolaz095/hunt/blob/master/examples/serverConfigsExamples/huntjs%40.service)
==================================

[Systemd linux initialization system](https://en.wikipedia.org/wiki/Systemd) allows us
to start HuntJs application as limited user on system startup.
After editing this file and placing it to `/etc/systemd/system`, we can control our huntjs 
application like this:

```shell

  $ su -c 'systemctl restart huntjs@myUserName.service'
  $ su -c 'systemctl start huntjs@myUserName.service'
  $ su -c 'systemctl status huntjs@myUserName.service'
  $ su -c 'systemctl enable huntjs@myUserName.service'
  $ su -c 'systemctl disable huntjs@myUserName.service'

```

[huntjs](https://github.com/vodolaz095/hunt/blob/master/examples/serverConfigsExamples/huntjs)
==================================
Config example to run HuntJS application by means of `chkconfig` - 
[http://linuxcommand.org/man_pages/chkconfig8.html](http://linuxcommand.org/man_pages/chkconfig8.html)