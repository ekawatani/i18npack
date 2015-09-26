'use strict';

// Dependent modules
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var yaml = require('js-yaml');

var FIXTURES_DIR = path.join(__dirname, 'fixtures');
var EXPECTED_DIR = path.join(__dirname, 'expected');

module.exports.buildTestDirPath = function(dirname, loadConfig) {
  var parentDir = loadConfig.loadExpected ? EXPECTED_DIR : FIXTURES_DIR;

  return path.join(parentDir, loadConfig.suitename, dirname);
};

module.exports.loadFile = function(filename, loadConfig) {
  var dirname = loadConfig.loadExpected ? EXPECTED_DIR : FIXTURES_DIR;
  var filePath = path.join(dirname, loadConfig.suitename, filename);

  var raw = fs.readFileSync(filePath, { encoding: 'utf8' });

  return loadConfig.parseData ? yaml.load(raw) : raw;
};
