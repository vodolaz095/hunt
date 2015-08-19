'use strict';

var nodemailer = require('nodemailer'),
  htmlToText = require('nodemailer-html-to-text').htmlToText,
  url = require('url');

require('colors');

module.exports = exports = function (core) {
  var transport,
    config = core.config.emailConfig,
    defaultCallback = function (error, response) {
      if (error) {
        console.error('Error sending email!', error);
      } else {
        console.log('Sending email was successful!', response);
      }
    },
    fromEmailAddr;

  if (config && typeof config === 'object') {
    if (!config.fromEmailAddr) {
      fromEmailAddr = 'hunt@' + url.parse(core.config.hostUrl).hostname;
    }

    if (config.service) {
      if (!(config.auth && config.auth.user && config.auth.pass)) {
        console.log('Mail Dispatcher: unable to find credentials! using fallback Direct transport. This is not recommended for production use!'.yellow);
        transport = nodemailer.createTransport();
      } else {
        console.log(('Mail Dispatcher: using options from hunt.config.emailConfig for service "' + config.service + '"').green);
        transport = nodemailer.createTransport(config);
      }
    } else {
      console.log('Mail Dispatcher: using options from hunt.config.emailConfig...'.yellow);
      transport = nodemailer.createTransport(config);
    }
    fromEmailAddr = core.config.emailConfig.fromEmailAddr;
  } else {
    console.log('Mail Dispatcher: using fallback Direct transport. This is not recommended for production use!'.yellow);
    transport = nodemailer.createTransport();
    fromEmailAddr = 'hunt@' + url.parse(core.config.hostUrl).hostname;
  }

  transport.use('compile', htmlToText());
  /**
   * @method Hunt#sendMailAdvanced
   * @param {object} options
   * @param {function} callback - function(err,response){} to be fired when message is send
   * @description
   * Expose Nodemailer function sendMail with full options available from here
   * {@link https://github.com/andris9/Nodemailer#e-mail-message-fields }
   * including {@link https://github.com/andris9/Nodemailer#attachment-fields | attachments }
   * and {@link  https://github.com/andris9/Nodemailer#alternative-fields | alternatives }
   */
  core.extendCore('sendMailAdvanced', function () {
    return function (options, callback) {
      callback = callback || defaultCallback;
      transport.sendMail(options, callback);
    };
  });

  /**
   * @method Hunt#sendMail
   * @param {string} to  email address of receiver or comma separated list of receivers
   * @param {string} subject - raw text of subject
   * @param {string} text - raw text of message
   * @param {function} callback - function(err,response){} to be fired when message is send
   * @description
   * Send raw test email message
   */
  core.extendCore('sendEmail', function (c) {
    return function (to, subject, text, callback) {
      callback = callback || defaultCallback;
      c.sendMailAdvanced({
        'from' : fromEmailAddr,
        'to' : to,
        'subject' : subject,
        'text' : text
      }, callback);
    };
  });

  /**
   * @method Hunt#sendMailByTemplate
   * @param {string} to  email address of receiver or comma separated list of receivers
   * @param {string} subject - raw text of subject
   * @param {string} templateName
   * @param {object} data to render the template
   * @param {function} callback - function(err,response){} to be fired when message is send
   * @description
   * Send email message, rendered by http://expressjs.com/api.html#app.render
   */

  core.extendCore('sendMailByTemplate', function (c) {
    return function (to, subject, templateName, data, callback) {
      callback = callback || defaultCallback;
      if (typeof c.app.render === 'function') {
        data.layout = data.layout || false;//disabling layout by default
        c.app.render(templateName, data, function (err, html) {
          if (err) {
            callback(err);
          } else {
            c.sendMailAdvanced({
              'from' : fromEmailAddr,
              'to' : to,
              'subject' : subject,
              'html' : html
            }, callback);
          }
        });
      } else {
        callback(new Error('Unable to call core.app.render(viewName,options,function(err,html)). Is view engine properly installed?'));
      }
    };
  });
  core.on('user:notify:email', function (messageObj) {
    if (core.config.env === 'development') {
      console.log('Sending email', messageObj);
    }
    if (messageObj.user && messageObj.user.email && messageObj.message) {
      if (typeof messageObj.message === 'string') {
        core.sendEmail(messageObj.user.email, 'Personal notification', messageObj.message);
      } else {
        messageObj.message.template = messageObj.message.template || 'email';
        messageObj.message.user = messageObj.user;
        core.sendMailByTemplate(messageObj.user.email, messageObj.message.subject, messageObj.message.template, messageObj.message);
      }
    }
  });
  return core;
};
