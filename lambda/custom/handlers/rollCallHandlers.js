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
  AnswerQuestionHandler: {
    canHandle(handlerInput) {
      logger.log('DEBUG', 'ROLLCALL.AnswerQuestionHandler: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'IntentRequest' &&
        (requestEnvelope.request.intent.name === 'AnswerQuestionIntent' ||
          requestEnvelope.request.intent.name === 'AnswerOnlyIntent') &&
        attributesManager.getSessionAttributes().STATE === settings.STATE.ROLLCALL_STATE;
    },
    handle(handlerInput) {
      logger.log('DEBUG', 'ROLLCALL.AnswerQuestionHandler: handle');
      let {
        attributesManager,
        responseBuilder
      } = handlerInput;
      let ctx = attributesManager.getRequestAttributes();
      let sessionAttributes = attributesManager.getSessionAttributes();

      let shouldRestartRollCall = !('playerCount' in sessionAttributes) ||
        !('inputHandlerId' in sessionAttributes);
      let uiKey = shouldRestartRollCall ? 'START_ROLL_CALL' : 'ANSWER_DURING_ROLLCALL';
      let uiPrompts = ctx.t(uiKey);
      ctx.outputSpeech.push(uiPrompts.outputSpeech);
      ctx.openMicrophone = shouldRestartRollCall;
      return responseBuilder.getResponse();
    }
  },
  PlayerCountHandler: {
    canHandle(handlerInput) {
      logger.log('DEBUG', 'ROLLCALL.PlayerCountHandler: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'IntentRequest' &&
        (requestEnvelope.request.intent.name === 'PlayerCount' ||
        requestEnvelope.request.intent.name === 'PlayerCountOnly') &&
        attributesManager.getSessionAttributes().STATE === settings.STATE.ROLLCALL_STATE;
    },
    handle(handlerInput) {
      logger.log('DEBUG', 'ROLLCALL.PlayerCountHandler: handle');
      let {
        requestEnvelope,
        attributesManager,
        responseBuilder
      } = handlerInput;
      const sessionAttributes = attributesManager.getSessionAttributes();

      sessionAttributes.rollCallComplete = false;
      let playerCount = requestEnvelope.request.intent.slots.players ?
        parseInt(requestEnvelope.request.intent.slots.players.value, 10) : 0;
      RollCall.resume(handlerInput, false, playerCount);
      return responseBuilder.getResponse();
    }
  },
  /**
   * Events from the game engine
   */
  GameEventHandler: {
    canHandle(handlerInput) {
      logger.log('DEBUG', 'ROLLCALL.GameEventHandler: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'GameEngine.InputHandlerEvent' &&
        attributesManager.getSessionAttributes().STATE === settings.STATE.ROLLCALL_STATE;
    },
    handle(handlerInput) {
      logger.log('DEBUG', 'ROLLCALL.GameEventHandler: handle');
      let {
        attributesManager,
        requestEnvelope,
        responseBuilder
      } = handlerInput;
      const sessionAttributes = attributesManager.getSessionAttributes();
      const ctx = attributesManager.getRequestAttributes();
      logger.log('DEBUG', 'CURRENT REQUEST ID: ' + sessionAttributes.inputHandlerId + ' ==?  ORIGINATING REQUEST ID: ' + requestEnvelope.request.originatingRequestId);
      if (requestEnvelope.request.originatingRequestId !== sessionAttributes.inputHandlerId) {
        logger.log('DEBUG', "Global.GameEngineInputHandler: stale input event received -> " +
          "received event from " + request.originatingRequestId +
          " (was expecting " + sessionAttributes.CurrentInputHandlerID + ")");
        ctx.openMicrophone = false;
        return handlerInput.responseBuilder.getResponse();
      }
      let inputEvents = requestEnvelope.request.events;
      RollCall.handleEvents(handlerInput, inputEvents);
      return responseBuilder.getResponse();
    }
  },
  /**
   * The player has responded 'no' to the option of resuming the previous game.
   */
  NoHandler: {
    canHandle(handlerInput) {
      logger.log('DEBUG', 'ROLLCALL.NoHandler: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'IntentRequest' &&
        requestEnvelope.request.intent.name === 'AMAZON.NoIntent' &&
        attributesManager.getSessionAttributes().STATE === settings.STATE.ROLLCALL_STATE;
    },
    handle(handlerInput) {
      logger.log('DEBUG', 'ROLLCALL.NoHandler: handle');
      let {
        attributesManager,
        responseBuilder
      } = handlerInput;
      let sessionAttributes = attributesManager.getSessionAttributes();

      sessionAttributes.resume = false;
      RollCall.start(handlerInput);
      return responseBuilder.getResponse();
    }
  },
  /**
   * The player has responded 'yes' to the option of resuming the previous game.
   */
  YesHandler: {
    canHandle(handlerInput) {
      logger.log('DEBUG', 'ROLLCALL.NoHandler: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'IntentRequest' &&
        requestEnvelope.request.intent.name === 'AMAZON.YesIntent' &&
        attributesManager.getSessionAttributes().STATE === settings.STATE.ROLLCALL_STATE;
    },
    handle(handlerInput) {
      logger.log('DEBUG', 'ROLLCALL.NoHandler: handle');
      let {
        attributesManager,
        responseBuilder
      } = handlerInput;
      const sessionAttributes = attributesManager.getSessionAttributes();

      if (!!sessionAttributes.rollCallComplete) {
        sessionAttributes.rollCallComplete = (sessionAttributes.playerCount === sessionAttributes.buttonCount &&
          sessionAttributes.buttons &&
          sessionAttributes.buttons.length === sessionAttributes.buttonCount);
        logger.log('DEBUG', 'Determined that rollCall status is ' +
          (sessionAttributes.rollCallComplete ? 'COMPLETE' : 'IN-PROGRESS'));
      }

      // Resume Roll Call
      sessionAttributes.resume = true;
      if (sessionAttributes.playerCount > 0) {
        logger.log('DEBUG', 'Resume roll call. We know the number of players: ' +
          sessionAttributes.playerCount);
        // resume game play from a previous game
        if (!sessionAttributes.currentQuestion) {
          sessionAttributes.currentQuestion = 1;
        }
        RollCall.resume(handlerInput, !!sessionAttributes.rollCallComplete, sessionAttributes.playerCount);
      } else {
        logger.log('DEBUG', 'Resuming roll call, but starting from scratch!');
        RollCall.start(handlerInput);
      }
      return responseBuilder.getResponse();
    }
  }
}

module.exports = rollCallHandlers;