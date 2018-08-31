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
const directives = require('../utils/directives.js');

const startHandlers = {
  /**
   * Invoked when a user says 'open' or 'play' or some other variant
   */
  LaunchPlayGameHandler: {
    canHandle(handlerInput) {
      logger.debug('START.LaunchPlayGameHandler: canHandle');
      let {
        requestEnvelope
      } = handlerInput;
      return (requestEnvelope.request.type === 'LaunchRequest' ||
          requestEnvelope.request.type === 'NewSession' ||
          (requestEnvelope.request.type === 'IntentRequest' &&
            requestEnvelope.request.intent.name === 'PlayGame'));
    },
    handle(handlerInput) {
      logger.debug('START.LaunchPlayGameHandler: handle');
      let {
        attributesManager,
        responseBuilder
      } = handlerInput;
      let ctx = attributesManager.getRequestAttributes();
      let sessionAttributes = attributesManager.getSessionAttributes();
      sessionAttributes.STATE = settings.STATE.START_GAME_STATE;

      /**
       * Check to see if we have an active game
       */
      let validPlayerCount = sessionAttributes.playerCount &&
        sessionAttributes.playerCount <= settings.GAME.MAX_PLAYERS && sessionAttributes.playerCount > 0;
      let gameInProgress = (sessionAttributes.currentQuestion || 0) <= settings.GAME.QUESTIONS_PER_GAME;

      /**
       * If we have an active game ask to resume, otherwise start a new game and ask how many players.
       */
      let responseMessage;
      if (validPlayerCount && gameInProgress) {
        responseMessage = ctx.t('ASK_TO_RESUME', {'player_count': sessionAttributes.playerCount});
      } else {
        responseMessage = ctx.t('START_GAME');

        // it's a new game so delete all attributes
        let attributeNames = Object.keys(sessionAttributes);
        for (let k = 0; k < attributeNames.length; k++) {
          delete sessionAttributes[attributeNames[k]];
        }
      }
      ctx.outputSpeech.push(responseMessage.outputSpeech);
      ctx.reprompt.push(responseMessage.reprompt);
      ctx.render(handlerInput, responseMessage);
      ctx.openMicrophone = true;

      // Send an intro animation to all connected buttons
      ctx.directives.push(directives.GadgetController.setIdleAnimation({
        'animations': settings.ANIMATIONS.INTRO_ANIMATION
      }));

      return responseBuilder.getResponse();
    }
  },
  StartNewGameHandler: {
    canHandle(handlerInput) {
      logger.debug('START.StartNewGameHandler: canHandle');
      let request = handlerInput.requestEnvelope.request;
      return request.type === 'IntentRequest' &&
        request.intent.name === 'AMAZON.StartOverIntent';
    },
    handle(handlerInput) {
      logger.debug('START.StartNewGameHandler: handle');
      let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
      // Deleting playerCount to force launching of a new game
      delete sessionAttributes.playerCount;
      return startHandlers.LaunchPlayGameHandler.handle(handlerInput);
    }
  },
  PlayerCountHandler: {
    canHandle(handlerInput) {
      logger.debug('START.PlayerCountHandler: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'IntentRequest' &&
        (requestEnvelope.request.intent.name === 'PlayerCount' ||
        requestEnvelope.request.intent.name === 'PlayerCountOnly') &&
        attributesManager.getSessionAttributes().STATE === settings.STATE.START_GAME_STATE;
    },
    handle(handlerInput) {
      logger.debug('START.PlayerCountHandler: handle');
      let {
        requestEnvelope,
        attributesManager,
        responseBuilder
      } = handlerInput;
      let sessionAttributes = attributesManager.getSessionAttributes();
      let ctx = attributesManager.getRequestAttributes();

      sessionAttributes.playerCount = requestEnvelope.request.intent.slots.players && 
        !isNaN(requestEnvelope.request.intent.slots.players.value) ?
        parseInt(requestEnvelope.request.intent.slots.players.value, 10) : 0;

      let validPlayerCount = sessionAttributes.playerCount &&
        (sessionAttributes.playerCount <= settings.GAME.MAX_PLAYERS) && (sessionAttributes.playerCount > 0);

      if (validPlayerCount){
        if (sessionAttributes.playerCount === 1){
          // Play a buttonless game
          sessionAttributes.STATE = settings.STATE.BUTTONLESS_GAME_STATE;

          let responseMessage = ctx.t('SINGLE_PLAYER_GAME_READY');
          ctx.render(handlerInput, responseMessage);
          ctx.outputSpeech.push(settings.AUDIO.ROLL_CALL_COMPLETE);
          ctx.outputSpeech.push(responseMessage.outputSpeech);
          ctx.reprompt.push(responseMessage.reprompt);
          ctx.openMicrophone = true;
        } else {
          RollCall.start(handlerInput, false, sessionAttributes.playerCount);
        }
      } else {
        let responseMessage = ctx.t('PLAYERCOUNT_INVALID');
        ctx.outputSpeech.push(responseMessage.outputSpeech);
        ctx.reprompt.push(responseMessage.reprompt);
        ctx.openMicrophone = true;
      }

      return responseBuilder.getResponse();
    }
  },
  /**
   * The player has responded 'no' to the option of resuming the previous game.
   */
  NoHandler: {
    canHandle(handlerInput) {
      logger.debug('START.NoHandler: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'IntentRequest' &&
        requestEnvelope.request.intent.name === 'AMAZON.NoIntent' &&
        (attributesManager.getSessionAttributes().STATE === settings.STATE.START_GAME_STATE);
    },
    handle(handlerInput) {
      logger.debug('START.NoHandler: handle');
      let {
        attributesManager,
        responseBuilder
      } = handlerInput;
      let sessionAttributes = attributesManager.getSessionAttributes();
      let ctx = attributesManager.getRequestAttributes();

      let responseMessage = ctx.t('DONT_RESUME_GAME');
      ctx.outputSpeech.push(responseMessage.outputSpeech);
      ctx.reprompt.push(responseMessage.reprompt);
      ctx.render(handlerInput, responseMessage);
      ctx.openMicrophone = true;

      // Send an intro animation to all connected buttons
      ctx.directives.push(directives.GadgetController.setIdleAnimation({
        'animations': settings.ANIMATIONS.INTRO_ANIMATION
      }));

      // it's a new game so delete all attributes
      let attributeNames = Object.keys(sessionAttributes);
      for (let k = 0; k < attributeNames.length; k++) {
        delete sessionAttributes[attributeNames[k]];
      }

      return responseBuilder.getResponse();
    }
  },
  /**
   * The player has responded 'yes' to the option of resuming the previous game.
   */
  YesHandler: {
    canHandle(handlerInput) {
      logger.debug('START.NoHandler: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'IntentRequest' &&
        requestEnvelope.request.intent.name === 'AMAZON.YesIntent' &&
        attributesManager.getSessionAttributes().STATE === settings.STATE.START_GAME_STATE;
    },
    handle(handlerInput) {
      logger.debug('START.NoHandler: handle');
      let {
        attributesManager,
        responseBuilder
      } = handlerInput;
      let sessionAttributes = attributesManager.getSessionAttributes();
      let ctx = attributesManager.getRequestAttributes();

      let validPlayerCount = sessionAttributes.playerCount &&
        sessionAttributes.playerCount <= settings.GAME.MAX_PLAYERS && sessionAttributes.playerCount > 0;

      if (validPlayerCount) {
        logger.debug('Resume roll call. We know the number of players: ' + sessionAttributes.playerCount);

        if (sessionAttributes.playerCount === 1){
          // Play a buttonless game
          sessionAttributes.STATE = settings.STATE.BUTTONLESS_GAME_STATE;

          let responseMessage = ctx.t('SINGLE_PLAYER_GAME_READY');
          ctx.render(handlerInput, responseMessage);
          ctx.outputSpeech.push(settings.AUDIO.ROLL_CALL_COMPLETE);
          ctx.outputSpeech.push(responseMessage.outputSpeech);
          ctx.reprompt.push(responseMessage.reprompt);
          ctx.openMicrophone = true;
        } else {
          let resumingGame = (sessionAttributes.buttons && sessionAttributes.buttons.length === sessionAttributes.playerCount);
          RollCall.start(handlerInput, resumingGame, sessionAttributes.playerCount);
        }
      } else {
        logger.debug('Resuming roll call, but starting from scratch!');

        // Send an intro animation to all connected buttons
        ctx.directives.push(directives.GadgetController.setIdleAnimation({
          'animations': settings.ANIMATIONS.INTRO_ANIMATION
        }));

        let responseMessage = ctx.t('RESUME_GAME');
        ctx.outputSpeech.push(responseMessage.outputSpeech);
        ctx.reprompt.push(responseMessage.reprompt);
        ctx.render(handlerInput, responseMessage);
        ctx.openMicrophone = true;
      }
      return responseBuilder.getResponse();
    }
  }
}

module.exports = startHandlers;