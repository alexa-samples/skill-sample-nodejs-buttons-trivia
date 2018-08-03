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

const RollCall = require('../utils/rollcall.js');
const logger = require('../utils/logger.js');
const settings = require('../config/settings.js');

/**
 * Handling everything for the ROLLCALL_STATE state.
 */
const rollCallExitHandlers = {
  /**
   * The player has responded 'no' to the option of resuming the previous game.
   */
  NoHandler: {
    canHandle(handlerInput) {
      logger.log('DEBUG', 'ROLLCALL_EXIT.NoHandler: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'IntentRequest' &&
        requestEnvelope.request.intent.name === 'AMAZON.NoIntent' &&
        attributesManager.getSessionAttributes().STATE === settings.STATE.ROLLCALL_EXIT_STATE;
    },
    handle(handlerInput) {
      // @TODO Refactor This - it's generally in Global StopCancel
      logger.log('DEBUG', 'ROLLCALL_EXIT.NoHandler: handle');
      let {
        attributesManager,
        responseBuilder
      } = handlerInput;
      let ctx = attributesManager.getRequestAttributes();
      let {
        outputSpeech
      } = ctx.t('GOOD_BYE');

      ctx.outputSpeech.push(outputSpeech);
      ctx.openMicrophone = false;
      ctx.endSession = true;

      return responseBuilder.getResponse();
    }
  },
  /**
   * The player wants to resume rollcall.
   */
  YesHandler: {
    canHandle(handlerInput) {
      logger.log('DEBUG', 'ROLLCALL_EXIT.YesPlayGameHandler: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'IntentRequest' &&
        requestEnvelope.request.intent.name === 'AMAZON.YesIntent' &&
        attributesManager.getSessionAttributes().STATE === settings.STATE.ROLLCALL_EXIT_STATE;
    },
    handle(handlerInput) {
      logger.log('DEBUG', 'ROLLCALL_EXIT.YesPlayGameHandler: handle');
      let {
        attributesManager,
        responseBuilder
      } = handlerInput;
      let sessionAttributes = attributesManager.getSessionAttributes();
      sessionAttributes.STATE = settings.STATE.ROLLCALL_STATE;
      RollCall.resume(handlerInput, false, sessionAttributes.playerCount);
      return responseBuilder.getResponse();
    }
  }
}

module.exports = rollCallExitHandlers;