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

const RequiredParam = function (param) {
  const requiredParamError = new Error(
    `Required parameter, "${param}" is missing.`
  )
  // preserve original stack trace
  if (typeof Error.captureStackTrace === 'function') {
    Error.captureStackTrace(
      requiredParamError,
      RequiredParam
    )
  }
  throw requiredParamError;
};

const GameEngine = {
  // returns a StartInputHandler directive that can be added to an Alexa skill response
  startInputHandler: function ({
    timeout = RequiredParam('timeout'),
    proxies,
    recognizers = RequiredParam('recognizers'),
    events = RequiredParam('events')
  } = {}, params) {
    return {
      "type": "GameEngine.StartInputHandler",
      "timeout": (params && params.timeout) || timeout,
      "proxies": (params && params.proxies) || proxies,
      "recognizers": (params && params.recognizers) || recognizers,
      "events": (params && params.events) || events,
    };
  },

  // returns a StopInputHandler directive that can be added to an Alexa skill response
  stopInputHandler: function ({
    id = RequiredParam('id')
  } = {}) {
    return {
      "type": "GameEngine.StopInputHandler",
      "originatingRequestId": id
    };
  },
};
const GadgetController = {
  // returns a SetLight directive, with a 'buttonDown' trigger, that can be added to an Alexa skill response
  setButtonDownAnimation: function ({
    targetGadgets = [],
    animations = RequiredParam('animations'),
    triggerEventTimeMs = 0
  } = {}, params) {
    return {
      "type": "GadgetController.SetLight",
      "version": 1,
      "targetGadgets": (params && params.targetGadgets) || targetGadgets,
      "parameters": {
        "animations": (params && params.animations) || animations,
        "triggerEvent": "buttonDown",
        "triggerEventTimeMs": (params && params.triggerEventTimeMs) || triggerEventTimeMs,
      }
    };
  },

  // returns a SetLight directive, with a 'buttonUp' trigger, that can be added to an Alexa skill response
  setButtonUpAnimation: function ({
    targetGadgets = [],
    animations = RequiredParam('animations'),
    triggerEventTimeMs = 0
  } = {}, params) {
    return {
      "type": "GadgetController.SetLight",
      "version": 1,
      "targetGadgets": (params && params.targetGadgets) || targetGadgets,
      "parameters": {
        "animations": (params && params.animations) || animations,
        "triggerEvent": "buttonUp",
        "triggerEventTimeMs": (params && params.triggerEventTimeMs) || triggerEventTimeMs,
      }
    };
  },

  // returns a SetLight directive, with a 'none' trigger, that can be added to an Alexa skill response
  setIdleAnimation: function ({
    targetGadgets = [],
    animations = RequiredParam('animations'),
    triggerEventTimeMs = 0
  } = {}, params) {
    return {
      "type": "GadgetController.SetLight",
      "version": 1,
      "targetGadgets": (params && params.targetGadgets) || targetGadgets,
      "parameters": {
        "animations": (params && params.animations) || animations,
        "triggerEvent": "none",
        "triggerEventTimeMs": (params && params.triggerEventTimeMs) || triggerEventTimeMs,
      }
    };
  }
};

module.exports.GameEngine = GameEngine;
module.exports.GadgetController = GadgetController;