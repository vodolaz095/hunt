var hunt = require('./../index.js')({
  'port': 3000,
  'mongoUrl': 'mongo://localhost/hunt_dev',
  'enableMongoose': true,
  'disableCsrf': true
});

/*
 * Creating mongoose model of Trophies
 * So, this model is accessible by hunt.model.Trophy
 * and by request.model.Trophy in controllers
 */
hunt.extendModel('Trophy', require('./models/trophy.model.js'));

/*
 * Exporting Trophy model as REST interface
 */
hunt.exportModelToRest({
  'mountPount': '/api/v1/trophy',
  'modelName': 'Trophy',
  'ownerId': 'author'
});

/*
 * Exporting User model as REST interface
 */
hunt.exportModelToRest({
  'mountPount': '/api/v1/user',
  'modelName': 'User',
  'ownerId': '_id'
});

hunt.startWebServer();