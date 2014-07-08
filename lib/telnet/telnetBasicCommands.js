exports.auth = function (core, client, credentials) {
  credentials = credentials.toString();
  if (credentials) {
    var login = credentials.split(':::')[0],
      password = credentials.split(':::')[1];

    if (login && password) {
      core.model.User.findOneFuzzy(login, function (error, userFound) {
        if (error) {
          throw error;
        } else {
          if (userFound) {
            if (userFound.verifyPassword(password)) {
              client.user = userFound;
              client.send(userFound.toString() + ', welcome!');
            } else {
              client.send('Authorization failed!');
            }
          } else {
            client.send('Authorization failed!');
          }
        }
      });
    } else {
      client.send('Wrong syntax! Try `auth myUsername:::myPassword`!');
    }
  } else {
    client.send('Wrong syntax! Try `auth myUsername:::myPassword`!');
  }
};

exports.logout = function (core, client) {
  client.send(client.user.toString() + ', bye-bye!');
  delete client.user;
};

exports.version = function (core, client) {
  client.send('Huntjs version is ' + core.version);
};

exports.whoami = function (core, client) {
  if (client.user) {
    client.send(client.user.toString());
  } else {
    client.send('Anonimus');
  }
};

exports.echo = function (core, client, payload) {
  client.send(payload);
};

exports.starttls = function (core, client, payload) {
  client.startTLS();//it does not work?
  client.on("tls", function () {
    client.send("Switched to secure connection");
  });
};

exports.quit = function (core, client, payload) {
  client.send('Good hunting! Bye-bye!');
  client.end();
};