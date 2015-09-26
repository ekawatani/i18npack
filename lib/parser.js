'use strict';

var _ = require('lodash');
var fs = require('fs');
var nativeTypes = require('./yamlTypes');
var yaml = require('js-yaml');
var traverse = require('traverse');
var query = require('./query');

function createCustomYAMLSchema(customTypes) {
  var yamlTypes = [];

  _.forEach(customTypes, function(constructFunc, key) {
    var tagAndType = key.split(/\s+/);
    var tagName = tagAndType[0];
    var tagType = tagAndType[1];

    var customType = new yaml.Type(tagName, {
      kind: tagType,
      construct: constructFunc
    });

    yamlTypes.push(customType);
  });

  return yamlTypes;
}

function escapeRegExpStr(text) {
  // Taken from http://stackoverflow.com/a/3561711
  return text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

function Parser(options) {
  this.languages = options.languages;
  this.schemaDir = options.schemaDir;
  this.delimiter = options.delimiter;
  this.strict = options.strict;
  this.langIndex = 0;

  var self = this;

  // Custom YAML types used in i18npack
  var i18npackTypes = {
    '!t sequence': function(values) {
      return nativeTypes.t(values, options.strict, options.languages, self.langIndex);
    },
    '!struct mapping': function(value) {
      return nativeTypes.struct(value, options.schemaDir);
    },
    '!extend mapping': function(value) {
      return nativeTypes.extend(value, self, options.languages[self.langIndex]);
    }
  };

  var customTypes = _.extend(options.customTypes, i18npackTypes);
  var yamlTypes = createCustomYAMLSchema(customTypes);

  this.yamlSchema = yaml.Schema.create(yamlTypes);
}

Parser.prototype.parse = function(stringData, targetLang) {
  this.langIndex = this.languages.indexOf(targetLang);
  return yaml.safeLoad(stringData, { schema: this.yamlSchema });
};

Parser.prototype.process = function(objData) {
  var self = this;

  return traverse(objData).forEach(function(node) {
    if (this.isLeaf) {
      var match;
      var newValue = node;

      while ((match = self.delimiter.exec(node)) !== null) {
        // match[0] is the matched text, and match[n] is the nth captured group.
        // For example, if the text is "This is a {{ test }}.", then match[0] is
        // "{{ test }}", and match[1] is " test ". The delimiter shouldn't
        // capture more than one group, so it only checks the first one.
        var matchedText = match[0];
        var matchedTextGroup = match[1].trim();

        var referencedValue = query.find(objData, matchedTextGroup);

        // Replaces the matched text (including the delimiter) with
        // `referencedValue`. Uses the global flag because more than one same
        // references may be present.
        var matchedRegExp = new RegExp(escapeRegExpStr(matchedText), 'g');
        newValue = newValue.replace(matchedRegExp, referencedValue);
      }

      this.update(newValue);
    }
  });
}

Parser.prototype.stringify = function(objData) {
  return JSON.stringify(objData);
};

module.exports = Parser;
