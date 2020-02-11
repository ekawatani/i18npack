'use strict';

var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var JsonValidator = require('./jsonValidator');

module.exports.t = function(values, strict, languages, langIndex) {
  if (strict) { 
    if (values.length < languages.length) {
      throw SyntaxError('Not enough translations were provided. Make sure translations for each language are provided.' +
        JSON.stringify(values));
    }
  }

  if (values.length > languages.length) {
    throw SyntaxError('Too many translations were found. Delete the translation that is not supported or add it as a supported language.' +
      JSON.stringify(values));
  }

  var langs = _.clone(languages).map(function(l) { return l.toLowerCase(); });
  var hasLanguageKeys = false;
  var hasNoLanguageKey = false;
  var found;

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
      var currentLanguage = langs[langIndex];

      if (languageKey.toLowerCase() == currentLanguage && !found) {
        found = keyedValue[languageKey]; // Keep the loop going so that it can validate whether all language keys are supported ones.
      }

      if (!langs.includes(languageKey.toLowerCase())) {
        throw SyntaxError('Unsupported language key "' + languageKey + '" was detected: ' +
          JSON.stringify(keyedValue));
      }

      hasLanguageKeys = true;
    } else {
      hasNoLanguageKey = true;
    }
  }

  if (found) {
    return found;
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