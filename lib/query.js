'use strict';

var _ = require('lodash');
var jsonQuery = require('json-query');

module.exports.find = function(objData, queryText) {
  var queryResult = jsonQuery(queryText, { data: objData });

  if (_.isUndefined(queryResult.value)) {
    throw new Error('The query "' + queryText + '" did not find anything.');
  }

  return queryResult.value;
};
