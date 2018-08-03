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
 * Handling everything currently in or returning to the DEFAULT state.
 */
const startHandlers = {
  /**
   * Invoked when a user says 'open' or 'play' or some other variant
   * when in DEFAULT or ROLLCALL state
   */
  LaunchPlayGameRequest: {
    canHandle(handlerInput) {
      logger.log('DEBUG', 'DEFAULT.LaunchRequest: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return (requestEnvelope.request.type === 'LaunchRequest' ||
          requestEnvelope.request.type === 'NewSession' || // @TODO NewSession Removed in SDKv2?
          (requestEnvelope.request.type === 'IntentRequest' &&
            requestEnvelope.request.intent.name === 'PlayGame'));
    },
    handle(handlerInput) {
      logger.log('DEBUG', 'DEFAULT.LaunchRequest: handle');
      let {
        attributesManager,
        requestEnvelope,
        responseBuilder
      } = handlerInput;
      let ctx = attributesManager.getRequestAttributes();
      let sessionAttributes = attributesManager.getSessionAttributes();
      let messageKey = 'ASK_TO_RESUME';

      /**
       * If it's a Launch then clean out the session attributes that may have carried over
       * and change the verbal response
       */
      if (requestEnvelope.request.type === 'LaunchRequest' ||
        requestEnvelope.request.type === 'NewSession') {
        delete sessionAttributes.expectingEndSkillConfirmation;
        delete sessionAttributes.resume;        
        delete sessionAttributes.inputHandlerId;
        delete sessionAttributes.correct;
        delete sessionAttributes.answeringButton;
        delete sessionAttributes.answeringPlayer;
        delete sessionAttributes.waitingForAnswer;
        sessionAttributes.gameStarting = true;
        messageKey = 'ASK_TO_RESUME_NEW_SESSION';
      }

      /**
       * Set to game starting state.
       */
      sessionAttributes.gameStarting = true;
      sessionAttributes.STATE = settings.STATE.ROLLCALL_STATE;

      let playerCount = sessionAttributes.playerCount;
      let rollCallComplete = 'rollCallComplete' in sessionAttributes && playerCount;
      let gameInProgress = (sessionAttributes.currentQuestion || 0) <= settings.GAME.QUESTIONS_PER_GAME;

      logger.log('DEBUG', 'DEFAULT_STATE - PlayGame (playerCount = ' + playerCount +
        ', rollCallComplete = ' + rollCallComplete +
        ', currentQuestion = ' + sessionAttributes.currentQuestion + ')');

      if (rollCallComplete && gameInProgress) {
        /**
         * Ask to resume an existing game
         */
        let responseMessage = ctx.t(messageKey, {
          'player_count': playerCount
        });
        ctx.outputSpeech.push(responseMessage.outputSpeech);
        ctx.reprompt.push(responseMessage.reprompt);
        ctx.render(handlerInput, responseMessage);
        ctx.openMicrophone = true;
      } else {
        /**
         * Start a new game
         */
        RollCall.start(handlerInput);
      }

      return responseBuilder.getResponse();
    }
  },
  /**
   * Result of the prompt to see if they want to 
   * resume their previous game. Reset the game state and
   * pass a variable to roll call (i.e. sessionAttributes.resume)
   * so we can affect the TTS to be more natural and sound different 
   * from the regular game start
   */
  NoHandler: {
    canHandle(handlerInput) {
      logger.log('DEBUG', 'DEFAULT.NoHandler: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'IntentRequest' &&
        requestEnvelope.request.intent.name === 'AMAZON.NoIntent' &&
        (attributesManager.getSessionAttributes().STATE === settings.STATE.DEFAULT_STATE);
    },
    handle(handlerInput) {
      logger.log('DEBUG', 'DEFAULT.NoHandler: handle');
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
   * Help and DontKnow both respond with general help
   */
  HelpDontKnowHandler: {
    canHandle(handlerInput) {
      logger.log('DEBUG', 'DEFAULT.HelpDontKnowHandler: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'IntentRequest' &&
        (requestEnvelope.request.intent.name === 'AMAZON.HelpIntent' ||
          requestEnvelope.request.intent.name === 'DontKnowIntent') &&
        attributesManager.getSessionAttributes().STATE === settings.STATE.DEFAULT_STATE;
    },
    handle(handlerInput) {
      logger.log('DEBUG', 'DEFAULT.HelpDontKnowHandler: handle');
      let {
        attributesManager,
        responseBuilder
      } = handlerInput;
      let ctx = attributesManager.getRequestAttributes();
      let {
        outputSpeech,
        reprompt
      } = ctx.t('GENERAL_HELP');

      ctx.outputSpeech.push(outputSpeech);
      ctx.reprompt.push(reprompt);
      ctx.openMicrophone = true;

      return responseBuilder.getResponse();
    }
  },
  /**
   * Stop and Cancel both respond by saying goodbye and ending the session by not setting openMicrophone
   */
  StopCancelHandler: {
    canHandle(handlerInput) {
      logger.log('DEBUG', 'DEFAULT.StopHandler: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'IntentRequest' &&
        (requestEnvelope.request.intent.name === 'AMAZON.StopIntent' ||
          requestEnvelope.request.intent.name === 'AMAZON.CancelIntent') &&
        (attributesManager.getSessionAttributes().STATE === settings.STATE.DEFAULT_STATE ||
          attributesManager.getSessionAttributes().STATE === settings.STATE.ROLLCALL_STATE ||
          attributesManager.getSessionAttributes().STATE === settings.STATE.ROLLCALL_EXIT_STATE);
    },
    handle(handlerInput) {
      logger.log('DEBUG', 'DEFAULT.StopHandler: handle');
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
  }
}

module.exports = startHandlers;