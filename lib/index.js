/*
 * i18npack
 * https://github.com/ekawatani/i18npack
 *
 * Copyright (c) 2015 Ed
 * Licensed under the MIT license.
 */

'use strict';

var _ = require('lodash');
var fs = require('fs');
var glob = require('glob');
var mkdirp = require('mkdirp');
var path = require('path');

var Parser = require('./parser');

// The module to export.
var i18npack = module.exports = {};

/**
 * Provides the default settings for i18npack. Can be altered to change the
 * default behavior.
 */
var defaultSettings = {
  // An array of supported languages.
  languages: ['en'],

  // The path of a destination directory.
  dest: '.',

  // The directory containing schemas for source files.
  schemaDir: '.',

  // If true, the __lang__ and __langs__ properties will be added to the output files.
  includeLangDetails: true,

  // The options passed to the JSON validator.
  jsonValidatorOptions: {},

  // The delimiter used for processing templates.
  delimiter: /{{([\s\S]+?)}}/g,

  // An object of key-value pairs containing custom YAML types.
  customTypes: {},

  // If true, an error is thrown if the provided translations does not match the supported languages.
  strict: false,

  // If true, empty translations are included in the output.
  allowEmptyTranslations: false,

  // The file extension of output files.
  ext: '.json',

  // If true, the output of each file will be merged at the root. Otherwise, each file is namespaced by its file name.
  mergeFilesAtRoot: false,
};

/**
 * Generates a single JSON file for each language from multiple source
 * files.
 * @param   {string|array} filenames A glob pattern string matching the names
 *                                   of source files to use, or an array of the
 *                                   file names.
 * @param   {object}       options   Options used in this method.
 * @returns {void}
 */
i18npack.generate = function(filenames, options) {
  var optns = _.extend(i18npack.settings, options);
  var files = _.isArray(filenames) ? filenames : glob.sync(filenames);

  var parser = new Parser({
    languages: optns.languages,
    schemaDir: optns.schemaDir,
    delimiter: optns.delimiter,
    strict: optns.strict,
    allowEmptyTranslations: optns.allowEmptyTranslations,
    customTypes: optns.customTypes,
    jsonValidatorOptions: optns.jsonValidatorOptions,
  });

  optns.languages.forEach(function(lang) {
    var data = {};

    files.forEach(function(filepath) {
      var basename = path.basename(filepath, path.extname(filepath));
      var raw = fs.readFileSync(filepath, { encoding: 'utf8' });
      var parsed = parser.parse(raw, lang);

      if (optns.mergeFilesAtRoot) {
        _.forOwn(parsed, (value, key) => {
          if (data[key]) {
            throw Error(`The key ${key} from file ${basename} is already used.`);
          }
        }); 

        data = _.extend(data, parsed);
      } else {
        if (data[basename]) {
          throw Error('Duplicate file name found: ' + basename);
        }

        data[basename] = parsed;
      }
    });

    if (optns.includeLangDetails) {
      data.__lang__ = data.__lang__ || lang;
      data.__langs__ = data.__langs__ || optns.languages;
    }

    var outputFilePath = path.join(optns.dest, lang + optns.ext);
    var processed = parser.process(data);
    var stringified = parser.stringify(processed);

    mkdirp.sync(optns.dest);

    fs.writeFileSync(outputFilePath, stringified, { encoding: 'utf8' });
  });
};

/**
 * Resets the i18npack settings.
 *
 * @returns {void}
 */
i18npack.reset = function() {
  i18npack.settings = _.clone(defaultSettings);
}

// Initializes the settings.
i18npack.reset();
