'use strict';

var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var JsonValidator = require('./jsonValidator');

module.exports.t = function(values, strict, languages, langIndex) {
  if (strict) { 
    if (values.length < languages.length) {
      throw SyntaxError('Not enough translations were provided:' +
        JSON.stringify(values));
    }
    if (values.length > languages.length) {
      throw SyntaxError('Too many translations were found:' +
        JSON.stringify(values));
    }
  }

  var hasLanguageKeys = false;
  var hasNoLanguageKey = false;

  // Assume the values are keyed with language code, and find the value for the current language.
  for(var i = 0; i < values.length; i++) {
    var keyedValue = values[i];

    // If it has a language key, it must be an object.
    if (_.isObject(keyedValue)) {
      // There can be only one language key per value.
      if (_.keys(keyedValue).length !== 1) {
        throw SyntaxError('Invalid object structure was detected: ' +
          JSON.stringify(keyedValue));
      }

      var languageKey = _.keys(keyedValue)[0];
      var currentLanguage = languages[langIndex];

      if (languageKey == currentLanguage) {
        return keyedValue[currentLanguage];
      }

      if (!languages.includes(languageKey)) {
        throw SyntaxError('Unsupported language key was detected: ' +
          JSON.stringify(obj));
      }

      hasLanguageKeys = true;
    } else {
      hasNoLanguageKey = true;
    }
  }

  // When using language keys, it is assumed all translations are keyed, but some did not have a key.
  if (hasLanguageKeys && hasNoLanguageKey) {
    throw SyntaxError('Invalid object structure was detected: ' +
      JSON.stringify(keyedValue));
  }

  // All translations are keyed, but the one for the target language was not found.
  if (hasLanguageKeys) {
    return null;
  }

  // There were no languages keys. Simply return the value based on the language index.
  return values[langIndex];
};

module.exports.struct = function(value, schemaDir, validatorOptions) {
  if (_.isUndefined(value._schema)) {
    throw new SyntaxError('Using !struct, but _schema is missing.');
  }

  var schemaPath = path.join(schemaDir, value._schema);
  var mappings = _.omit(value, '_schema');
  var rawSchema = fs.readFileSync(schemaPath, { encoding: 'utf8' });
  var parsedSchema = JSON.parse(rawSchema);

  var validator = new JsonValidator(validatorOptions);
  var error = validator.validate(mappings, parsedSchema);

  if (error) {
    throw error;
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