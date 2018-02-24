'use strict';

var Ajv = require('ajv');

function JsonValidator(options) {
  this.ajv = new Ajv(options);
}

JsonValidator.prototype.validate = function(data, schema) {
  var valid = this.ajv.validate(schema, data);
  
  return valid ? null : JSON.stringify(this.ajv.errors);
};

module.exports = JsonValidator;