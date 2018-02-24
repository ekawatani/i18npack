'use strict';

var Ajv = require('ajv');

function JsonValidator(options) {
  this.ajv = new Ajv(options);
}

JsonValidator.prototype.validate = function(data, schema) {
  this.ajv.validate(schema, data);
  
  return this.ajv.errors;
};

module.exports = JsonValidator;