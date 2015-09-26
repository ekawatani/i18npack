'use strict';

var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var tv4 = require('tv4');

module.exports.t = function(values, strict, languages, langIndex) {
  if (values.length < languages.length) {
    throw SyntaxError('Not enough translations were provided.');
  }

  if (strict) {
    if (values.length > languages.length) {
      throw SyntaxError('Too many translations were found.');
    }
    if (_.isEmpty(values[langIndex])) {
      throw SyntaxError('Empty translation string was found.');
    }
  }

  if (_.isObject(values[langIndex])) {
    var obj = values[langIndex];

    if (_.keys(obj).length !== 1 || !_.has(obj, languages[langIndex])) {
      throw SyntaxError('Invalid object structure was detected: ' +
        JSON.stringify(obj));
    }

    return obj[languages[langIndex]];
  }

  return values[langIndex];
};

module.exports.struct = function(value, schemaDir) {
  if (_.isUndefined(value._schema)) {
    throw new SyntaxError('Using !struct, but _schema is missing.');
  }

  var schemaPath = path.join(schemaDir, value._schema);
  var mappings = _.omit(value, '_schema');
  var raw = fs.readFileSync(schemaPath, { encoding: 'utf8' });
  var parsed = JSON.parse(raw);

  tv4.validate(mappings, parsed);

  if (tv4.error) {
    throw tv4.error;
  }

  return mappings;
};

module.exports.extend = function(value, yaml, targetLang) {
  if (_.isUndefined(value._base)) {
    throw new SyntaxError('Using !extend, but _base is missing.');
  }

  var mappings = _.omit(value, '_base');
  var raw = fs.readFileSync(value._base, { encoding: 'utf8' });
  var parsed = yaml.parse(raw, targetLang);

  return _.extend(parsed, mappings);
}