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
const rollCallHandlers = {
  /**
   * Events from the game engine
   */
  GameEventHandler: {
    canHandle(handlerInput) {
      logger.debug('ROLLCALL.GameEventHandler: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'GameEngine.InputHandlerEvent' &&
        attributesManager.getSessionAttributes().STATE === settings.STATE.ROLLCALL_STATE;
    },
    handle(handlerInput) {
      logger.debug('ROLLCALL.GameEventHandler: handle');
      let {
        attributesManager,
        requestEnvelope,
        responseBuilder
      } = handlerInput;
      const sessionAttributes = attributesManager.getSessionAttributes();
      const ctx = attributesManager.getRequestAttributes();

      // Ensure the events are current
      if (requestEnvelope.request.originatingRequestId !== sessionAttributes.inputHandlerId) {
        logger.debug("Global.GameEngineInputHandler: stale input event received -> " +
          "received event from " + request.originatingRequestId +
          " (was expecting " + sessionAttributes.inputHandlerId + ")");
        ctx.openMicrophone = false;
        return handlerInput.responseBuilder.getResponse();
      }

      RollCall.handleEvents(handlerInput, requestEnvelope.request.events);
      return responseBuilder.getResponse();
    }
  },
  /**
   * The player has responded 'no' to the option of continuing roll call.
   */
  NoHandler: {
    canHandle(handlerInput) {
      logger.debug('ROLLCALL.NoHandler: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'IntentRequest' &&
        requestEnvelope.request.intent.name === 'AMAZON.NoIntent' &&
        attributesManager.getSessionAttributes().STATE === settings.STATE.ROLLCALL_STATE;
    },
    handle(handlerInput) {
      logger.debug('ROLLCALL.NoHandler: handle');
      let {
        attributesManager,
        responseBuilder
      } = handlerInput;
      let ctx = attributesManager.getRequestAttributes();

      let responseMessage = ctx.t('GOOD_BYE');
      ctx.outputSpeech.push(responseMessage.outputSpeech);
      ctx.openMicrophone = false;
      ctx.endSession = true;

      return responseBuilder.getResponse();
    }
  },
  /**
   * The player has responded 'yes' to the option of continuing roll call.
   */
  YesHandler: {
    canHandle(handlerInput) {
      logger.debug('ROLLCALL.YesHandler: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'IntentRequest' &&
        requestEnvelope.request.intent.name === 'AMAZON.YesIntent' &&
        attributesManager.getSessionAttributes().STATE === settings.STATE.ROLLCALL_STATE;
    },
    handle(handlerInput) {
      logger.debug('ROLLCALL.YesHandler: handle');
      let {
        attributesManager,
        responseBuilder
      } = handlerInput;
      let sessionAttributes = attributesManager.getSessionAttributes();

      RollCall.start(handlerInput, false, sessionAttributes.playerCount);
      return responseBuilder.getResponse();
    }
  }
}

module.exports = rollCallHandlers;