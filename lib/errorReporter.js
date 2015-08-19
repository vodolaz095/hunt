'use strict';

var url = require('url');

exports.reportHttpError = function (core, error) {
  if (core.config.adminEmail) {

    var
      hst = url.parse(core.config.hostUrl).hostname,
      message =
      '<html>' +
      '<body>' +
      '<h1>Error: ' + error.error.toString() + '</h1>' +
      '<p>Stack:</p><hr>' +
      '<pre>' + error.errorStack + '</pre><hr>' +
      '<p><b>Timestamp:</b> ' + error.startTime + '</p>' +
      '<p><b>Method:</b> ' + error.method + '</p>' +
      '<p><b>URL: </b> ' + core.config.hostUrl.slice(0, -1) + error.uri + '</p>' +
      '<p><b>Query (GET parameters):</b> ' + JSON.stringify(error.query) + '</p>' +
      '<p><b>Body (POST parameters):</b> ' + JSON.stringify(error.body) + '</p>' +
      '<p><b>Request processing duration:</b> ' + error.duration + ' ms</p>' +
      '<p><b>IP:</b> ' + error.ip + '</p>' +
      '<p><b>IPS (if proxy was used): </b> ' + error.ips.join(', ') + '</p>' +
      '<p><b>User: </b> ' + JSON.stringify(error.user) + '</p>' +
      '<hr><p>Sincerely yours, <br/> HuntJS Error reporter</p>' +
      '</body>' +
      '</html>';

    core.sendMailAdvanced({
      'from': 'huntjs@' + hst,
      'to': core.config.adminEmail,
      'subject': 'Your HuntJS application did a very bad thing!',
      'generateTextFromHTML': true,
      'html': message
    }, console.error);
  }
};

exports.reportOtherError = function (core, error) {
  if (core.config.adminEmail) {
     //todo!
  }
};