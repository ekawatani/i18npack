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

  // The delimiter used for processing templates.
  delimiter: /{{([\s\S]+?)}}/g,

  // An object of key-value pairs containing custom YAML types.
  customTypes: {},

  // If true, an error is thrown if all translations are not provided. An empty
  // string is inserted for missing translations, otherwise.
  strict: false,

  // The file extension of output files.
  ext: '.json'
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
    customTypes: optns.customTypes
  });

  optns.languages.forEach(function(lang) {
    var data = {};

    files.forEach(function(filepath) {
      var basename = path.basename(filepath, path.extname(filepath));
      var raw = fs.readFileSync(filepath, { encoding: 'utf8' });
      var parsed = parser.parse(raw, lang);

      if (data[basename]) {
        throw Error('Duplicate file name found: ' + basename);
      }

      data[basename] = parsed;
    });

    data.lang = data.lang || lang;
    data.langs = data.langs || optns.languages;

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
