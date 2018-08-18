/*
* Copyright 2018 Amazon.com, Inc. and its affiliates. All Rights Reserved.
* Licensed under the Amazon Software License (the "License").
* You may not use this file except in compliance with the License.
* A copy of the License is located at
* http://aws.amazon.com/asl/
* or in the "license" file accompanying this file. This file is distributed
* on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
* express or implied. See the License for the specific language governing
* permissions and limitations under the License.
*/
'use strict';

function getLevelValue(level) {
  switch (level) {
    case 'DEBUG':
      return 3;
    case 'WARN':
      return 1;
    case 'ERROR':
      return 0;
    default:
      return 2;
  }
}

const LOG_VALUE = getLevelValue(require('../config/settings.js').LOG_LEVEL);

function log(level, entry) {
  if (getLevelValue(level) <= LOG_VALUE) {
    console.log('# ' + level + ' # ' + entry);
  }
}

function info(entry){
  log('INFO', entry);
}

function debug(entry){
  log('DEBUG', entry);
}

function warn(entry){
  log('WARN', entry);
}

function error(entry){
  log('ERROR', entry);
}

module.exports.log = log;
module.exports.info = info;
module.exports.debug = debug;
module.exports.warn = warn;
module.exports.error = error;