'use strict';

// Modules to test
var i18npack = require('..');
var Parser = require('../lib/parser');

// Dependent modules
var _ = require('lodash');
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var testutil = require('./testutil');

describe('i18npack', function() {
  describe('#generate', function() {
    var loadConfig;
    var languages;
    var i18npackOptions;

    beforeEach(function() {
      loadConfig = {
        suitename: 'i18npack.generate',
        parseData: true
      };

      languages = ['en','fr'];

      i18npackOptions = {
        languages: languages,
        dest: '.tmp/test'
      };

      i18npack.reset();
    });

    function deepEqualTest(dirname) {
      var testDirName = testutil.buildTestDirPath(dirname, loadConfig);

      i18npack.generate(path.join(testDirName, '*.yml'), i18npackOptions);

      loadConfig.loadExpected = true;

      i18npackOptions.languages.forEach(function(lang) {
        var actualFileName = path.join(i18npackOptions.dest, lang + '.json');
        var raw = fs.readFileSync(actualFileName, { encoding: 'utf8' });
        var actual = JSON.parse(raw);

        var expectedFileName = path.join(dirname, lang + '.json');
        var expected = testutil.loadFile(expectedFileName, loadConfig);

        assert.deepEqual(actual, expected);
      });
    }

    it('Supports one language', function() {
      i18npackOptions.languages = ['en'];

      deepEqualTest('1_lang');
    });

    it('Supports multiple languages', function() {
      deepEqualTest('2_lang');
    });

    it('Should be able to reference a value in a different file', function() {
      deepEqualTest('cross_file_refs');
    });

    it('Language info is not appended if placeholder is taken', function() {
      deepEqualTest('lang_info');
    });

    it('Empty translations are not included', function() {
      deepEqualTest('empty');
    });

    it('Missing language keys are not included', function() {
      deepEqualTest('missing-keys');
    });

    it('Templates work in translated strings', function() {
      deepEqualTest('template-and-translate');
    });

    it('Supports merging files at root', function () {
      i18npackOptions.mergeFilesAtRoot = true;

      deepEqualTest('merge-at-root');
    });

    it('Supports not matching case', function() {
      i18npackOptions.languages = ['EN', 'Fr'];
      deepEqualTest("not-matching-case");
    });

    it('Supports custom output file extension', function() {
      var testDirName = testutil.buildTestDirPath('1_lang', loadConfig);

      i18npackOptions.ext = '.i18n.json';
      i18npackOptions.languages = ['en'];
      i18npack.generate(path.join(testDirName, 'bio.yml'), i18npackOptions);

      var stats = fs.lstatSync(path.join(i18npackOptions.dest, 'en.i18n.json'));
      assert(stats.isFile());
    });

    it('Conflicting key names should throw', function() {
      var testDirName = testutil.buildTestDirPath('duplicate_keys', loadConfig);

      i18npackOptions.languages = ['en'];

      assert.throws(function() {
        i18npack.generate(path.join(testDirName, '**/*.yml'), i18npackOptions);
      }, function(err) {
        return /Duplicate/.test(err);
      });
    });

    it('Conflicting key names from multiple files should throw when mergeFilesAtRoot is true', function () {
      var testDirName = testutil.buildTestDirPath('duplicate_keys_multiFiles', loadConfig);

      i18npackOptions.languages = ['en'];
      i18npackOptions.mergeFilesAtRoot = true;

      assert.throws(function () {
        i18npack.generate(path.join(testDirName, '**/*.yml'), i18npackOptions);
      }, function (err) {
        return /The key/.test(err);
      });
    });
  });
});

describe('parser', function() {
  describe('#parse', function() {
    var loadConfig;
    var languages;
    var parserOptions;

    beforeEach(function() {
      loadConfig = {
        suitename: 'parser.parse'
      };

      languages = ['en','fr'];

      parserOptions = {
        languages: languages,
        schemaDir: './test/schemas',
        delimiter: i18npack.settings.delimiter,
        strict: i18npack.settings.strict,
        customTypes: i18npack.settings.customTypes
      };

      i18npack.reset();
    });

    function deepEqualTest(parser, data, filename, lang) {
      var actual = parser.parse(data, lang);

      loadConfig.loadExpected = true;
      loadConfig.parseData = true;

      var expectedFileName = filename;
      if (lang) {
        var fileExt = path.extname(filename);
        expectedFileName = path.basename(filename, fileExt) + '.' + lang + fileExt;
      }

      var expected = testutil.loadFile(expectedFileName, loadConfig);

      assert.deepEqual(actual, expected);
    }

    function throwTest(parser, data, lang, errValidator) {
      assert.throws(function() {
        parser.parse(data, lang);
      }, function(err) {
        return _.isUndefined(errValidator) ? true : errValidator.call(null, err);
      });
    }

    it('No custom YAML types', function() {
      var filename = 'basic.yml';
      var data = testutil.loadFile(filename, loadConfig);

      var parser = new Parser(parserOptions);

      deepEqualTest(parser, data, filename);
    });

    it('!t: Basic', function() {
      var filename = 't.yml';
      var data = testutil.loadFile(filename, loadConfig);

      var parser = new Parser(parserOptions);

      languages.forEach(function(lang) {
        deepEqualTest(parser, data, filename, lang);
      });
    });

    it('!t: Not enough translations should not throw', function() {
      var filename = 't-notEnough.yml';
      var data = testutil.loadFile(filename, loadConfig);
      var parser = new Parser(parserOptions);

      languages.forEach(function(lang) {
        deepEqualTest(parser, data, filename, lang);
      });
    });

    it('!t: Too many translations should throw', function() {
      var data = testutil.loadFile("t-tooMany.yml", loadConfig);
      var parser = new Parser(parserOptions);

      languages.forEach(function(lang) {
        throwTest(parser, data, lang, function(err) {
          return err instanceof SyntaxError && /Too many translation/.test(err);
        });
      });
    });

    it('!t: Invalid structure should throw', function() {
      var data = testutil.loadFile('t-invalidStructure.yml', loadConfig);
      var parser = new Parser(parserOptions);

      throwTest(parser, data, 'en', function(err) {
        return err instanceof SyntaxError &&
          /Invalid object structure/.test(err);
      });
    });

    it('!t: When using languages keys, all translations must be keyed.', function() {
      var data = testutil.loadFile('t-invalidStructure-key.yml', loadConfig);
      var parser = new Parser(parserOptions);

      throwTest(parser, data, 'fr', function(err) {
        return err instanceof SyntaxError &&
          /Invalid object structure/.test(err);
      });
    });

    it('!t: Not enough translations should throw when strict', function() {
      var data = testutil.loadFile('t-notEnough.yml', loadConfig);
      parserOptions.strict = true;
      var parser = new Parser(parserOptions);

      languages.forEach(function(lang) {
        throwTest(parser, data, lang, function(err) {
          return err instanceof SyntaxError && /Not enough/.test(err);
        });
      });
    });

    it('!t: Too many translations should throw when strict', function() {
      var data = testutil.loadFile('t-tooMany.yml', loadConfig);
      parserOptions.strict = true;
      var parser = new Parser(parserOptions);

      languages.forEach(function(lang) {
        throwTest(parser, data, lang, function(err) {
          return err instanceof SyntaxError && /Too many/.test(err);
        });
      });
    });

    it('!t: Supports language keys', function() {
      var filename = 't-langKey.yml';
      var data = testutil.loadFile(filename, loadConfig);

      var parser = new Parser(parserOptions);

      languages.forEach(function(lang) {
        deepEqualTest(parser, data, filename, lang);
      });
    });

    it('!t: Supports language keys in any orders', function() {
      var filename = 't-langKey-order.yml';
      var data = testutil.loadFile(filename, loadConfig);

      var parser = new Parser(parserOptions);

      languages.forEach(function(lang) {
        deepEqualTest(parser, data, filename, lang);
      });
    });

    it("!t: Supports languages options in any case", function() {
      var filename = "t-langKey.yml";
      var data = testutil.loadFile(filename, loadConfig);
      parserOptions.languages = ['eN', 'Fr'];
      var parser = new Parser(parserOptions);

      languages.forEach(function(lang) {
        deepEqualTest(parser, data, filename, lang);
      });
    });

    it('!t: Language keys are case-insensitive', function () {
      var filename = 't-langKey-caseInsensitive.yml';
      var data = testutil.loadFile(filename, loadConfig);

      var parser = new Parser(parserOptions);

      languages.forEach(function (lang) {
        deepEqualTest(parser, data, filename, lang);
      });
    });

    it('!t: Unsupported language keys should throw', function() {
      var data = testutil.loadFile("t-langKey-unsupported.yml", loadConfig);
      parserOptions.strict = true;
      var parser = new Parser(parserOptions);

      languages.forEach(function(lang) {
        throwTest(parser, data, lang, function(err) {
          return err instanceof SyntaxError && /Unsupported language key "da/.test(err);
        });
      });
    });

    it('!struct: Basic', function() {
      var filename = 'struct.yml';
      var data = testutil.loadFile(filename, loadConfig);

      var parser = new Parser(parserOptions);

      deepEqualTest(parser, data, filename);
    });

    it('!struct: List of structs', function() {
      var filename = 'struct-list.yml';
      var data = testutil.loadFile(filename, loadConfig);

      var parser = new Parser(parserOptions);

      deepEqualTest(parser, data, filename);
    });

    it('!struct: Multiple languages', function() {
      var filename = 'struct-multiLangs.yml';
      var data = testutil.loadFile(filename, loadConfig);

      var parser = new Parser(parserOptions);

      languages.forEach(function(lang) {
        deepEqualTest(parser, data, filename, lang);
      });
    });

    it('!struct: If no schema tag is found, error should be thrown', function() {
      var data = testutil.loadFile('struct-noSchemaTag.yml', loadConfig);
      var parser = new Parser(parserOptions);

      throwTest(parser, data, 'en', function(err) {
        return err instanceof SyntaxError && /_schema/.test(err);
      });
    });

    it('!struct: If no schema file is found, error should be thrown', function() {
      var data = testutil.loadFile('struct-noSchemaFile.yml', loadConfig);
      var parser = new Parser(parserOptions);

      throwTest(parser, data, 'en', function(err) {
        return /ENOENT/.test(err);
      });
    });

    it('!struct: If source is invalid, error should be thrown', function() {
      var data = testutil.loadFile('struct-invalidSource.yml', loadConfig);
      var parser = new Parser(parserOptions);

      throwTest(parser, data, 'en');
    });

    it('Supports custom YAML types', function() {
      var filename = 'customTypes.yml';
      var data = testutil.loadFile(filename, loadConfig);
      parserOptions.customTypes = {
        '!max sequence': function(values) {
          return Math.max.apply(null, values);
        }
      };
      var parser = new Parser(parserOptions);

      deepEqualTest(parser, data, filename);
    });

    it('!extend: Basic', function() {
      var filename = 'extend.yml';
      var data = testutil.loadFile(filename, loadConfig);

      var parser = new Parser(parserOptions);

      deepEqualTest(parser, data, filename);
    });

    it('!extend: If no base tag is found, error should be thrown', function() {
      var data = testutil.loadFile('extend-noBaseTag.yml', loadConfig);
      var parser = new Parser(parserOptions);

      throwTest(parser, data, 'en', function(err) {
        return err instanceof SyntaxError && /_base/.test(err);
      });
    });
  });

  describe('#process', function() {
    var loadConfig;;
    var delimiter;
    var parserOptions;

    beforeEach(function() {
      loadConfig = {
        suitename: 'parser.process',
        parseData: true
      };

      delimiter = i18npack.settings.delimiter;

      parserOptions = {
        languages: ['en','fr'],
        delimiter: delimiter,
        strict: i18npack.settings.strict,
        customTypes: i18npack.settings.customTypes
      };

      i18npack.reset();
    });

    function deepEqualTest(parser, filename) {
      var data = testutil.loadFile(filename, loadConfig);

      var actual = parser.process(data);

      loadConfig.loadExpected = true;
      var expected = testutil.loadFile(filename, loadConfig);

      assert.deepEqual(actual, expected);
    }

    it('Basic', function() {
      var parser = new Parser(parserOptions);
      deepEqualTest(parser, 'basic.yml');
    });

    it('Ref referencing another ref', function() {
      var parser = new Parser(parserOptions);
      deepEqualTest(parser, 'deep.yml');
    });

    it('Different refs in one value', function() {
      var parser = new Parser(parserOptions);
      deepEqualTest(parser, 'different.yml');
    });

    it('More than one same refs in one value', function() {
      var parser = new Parser(parserOptions);
      deepEqualTest(parser, 'same.yml');
    });

    it('Invalid ref should throw', function() {
      var parser = new Parser(parserOptions);

      var data = testutil.loadFile('invalid.yml', loadConfig);

      assert.throws(function() {
        parser.process(data);
      }, function(err) {
        return /did not find anything/.test(err);
      });
    });

    it('Supports custom delimiter', function() {
      parserOptions.delimiter = /<%=([\s\S]+?)%>/g;
      var parser = new Parser(parserOptions);

      deepEqualTest(parser, 'custom-delimiter.yml');
    });

    it('arrayquery', function() {
      var parser = new Parser(parserOptions);
      deepEqualTest(parser, 'array-query.yml');
    });

    it('Empty translations are removed.', function() {
      var parser = new Parser(parserOptions);
      deepEqualTest(parser, 't-empty.yml');
    });

    it('Empty translations are not removed when allowEmptyTranslations is true', function() {
      parserOptions.allowEmptyTranslations = true;
      var parser = new Parser(parserOptions);
      deepEqualTest(parser, 't-allow-empty.yml');
    });
  });
});
