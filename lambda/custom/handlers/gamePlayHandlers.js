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

const Game = require('../utils/game.js');
const logger = require('../utils/logger.js');
const settings = require('../config/settings.js');

/**
 * Handling everything for the GAME_LOOP state.
 */
const gamePlayHandlers = {
  /**
   * The player has responded 'stop', 'cancel', no' to the option of resuming the previous game.
   */
  StopCancelNoHandler: {
    canHandle(handlerInput) {
      logger.log('DEBUG', 'GAME_LOOP.NoHandler: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'IntentRequest' &&
        (requestEnvelope.request.intent.name === 'AMAZON.NoIntent' ||
          requestEnvelope.request.intent.name === 'AMAZON.StopIntent' ||
          requestEnvelope.request.intent.name === 'AMAZON.CancelIntent') &&
        attributesManager.getSessionAttributes().STATE === settings.STATE.GAME_LOOP_STATE;
    },
    handle(handlerInput) {
      logger.log('DEBUG', 'GAME_LOOP.NoHandler: handle');
      Game.endGame(handlerInput, false);
      return handlerInput.responseBuilder.getResponse();
    }
  },
  /**
   * Events from the game engine
   */
  GameEventHandler: {
    canHandle(handlerInput) {
      logger.log('DEBUG', 'GAME_LOOP.GameEventHandler: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'GameEngine.InputHandlerEvent' &&
        attributesManager.getSessionAttributes().STATE === settings.STATE.GAME_LOOP_STATE;
    },
    handle(handlerInput) {
      logger.log('DEBUG', 'GAME_LOOP.GameEventHandler: handle');
      Game.handleGameInputEvent(handlerInput);
      return handlerInput.responseBuilder.getResponse();
    }
  },
  /**
   * Play game has been requested while already in the game play loop
   */
  PlayGameHandler: {
    canHandle(handlerInput) {
      logger.log('DEBUG', 'GAME_LOOP.PlayGameHandler: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'IntentRequest' &&
        requestEnvelope.request.intent.name === 'PlayGame' &&
        attributesManager.getSessionAttributes().STATE === settings.STATE.GAME_LOOP_STATE;
    },
    handle(handlerInput) {
      logger.log('DEBUG', 'GAME_LOOP.PlayGameHandler: handle');
      let { attributesManager, responseBuilder } = handlerInput;
      let ctx = attributesManager.getRequestAttributes();
      let sessionAttributes = attributesManager.getSessionAttributes();

      let isFirstQuestion = parseInt(sessionAttributes.currentQuestion || 0, 10) <= 1;
      let messageKey = isFirstQuestion ? 'PLAY_GAME_FIRST_QUESTION' : 'PLAY_GAME_MID_GAME';
      let responseMessage = ctx.t(messageKey, {current_question: sessionAttributes.currentQuestion})

      ctx.outputSpeech.push(responseMessage.outputSpeech + "<break time='1s'/>");

      Game.askQuestion(handlerInput, false);
      return responseBuilder.getResponse();
    }
  },
  /**
   * The player has responded 'yes' to 'are you ready'.
   */
  YesAskQuestionHandler: {
    canHandle(handlerInput) {
      logger.log('DEBUG', 'GAME_LOOP.AskQuestion: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'IntentRequest' &&
        (requestEnvelope.request.intent.name === 'AskQuestion' ||
          requestEnvelope.request.intent.name === 'AMAZON.YesIntent') &&
        attributesManager.getSessionAttributes().STATE === settings.STATE.GAME_LOOP_STATE;
    },
    handle(handlerInput) {
      logger.log('DEBUG', 'GAME_LOOP.AskQuestion: handle');

      Game.askQuestion(handlerInput, false);
      return handlerInput.responseBuilder.getResponse();
    }
  },
  /**
   * The player has responded with an answer.
   */
  AnswerHandler: {
    canHandle(handlerInput) {
      logger.log('DEBUG', 'GAME_LOOP.AnswerHandler: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'IntentRequest' &&
        (requestEnvelope.request.intent.name === 'AnswerQuestionIntent' ||
          requestEnvelope.request.intent.name === 'AnswerOnlyIntent') &&
        attributesManager.getSessionAttributes().STATE === settings.STATE.GAME_LOOP_STATE;
    },
    handle(handlerInput) {
      logger.log('DEBUG', 'GAME_LOOP.AnswerHandler: handle');
      Game.answerQuestion(handlerInput);
      return handlerInput.responseBuilder.getResponse();
    }
  },
  /**
   * The player has responded 'don''t know' or 'next'.
   */
  DontKnowNextHandler: {
    canHandle(handlerInput) {
      logger.log('DEBUG', 'GAME_LOOP.DontKnowNextHandler: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'IntentRequest' &&
        (requestEnvelope.request.intent.name === 'DontKnowIntent' ||
          requestEnvelope.request.intent.name === 'AMAZON.NextIntent') &&
        attributesManager.getSessionAttributes().STATE === settings.STATE.GAME_LOOP_STATE;
    },
    handle(handlerInput) {
      logger.log('DEBUG', 'GAME_LOOP.DontKnowNextHandler: handle');
      let { attributesManager, responseBuilder } = handlerInput;
      let sessionAttributes = attributesManager.getSessionAttributes();
      let ctx = attributesManager.getRequestAttributes();

      sessionAttributes.currentQuestion = parseInt(sessionAttributes.currentQuestion || 0, 10) + 1;
      delete sessionAttributes.repeat;
      let isLastQuestion = parseInt(sessionAttributes.currentQuestion || 1, 10) > settings.GAME.QUESTIONS_PER_GAME;
      let messageKey = isLastQuestion ? 'PLAY_GAME_SKIP_LAST_QUESTION' : 'PLAY_GAME_SKIP_QUESTION';
      let responseMessage = ctx.t(messageKey, sessionAttributes.currentQuestion);
      ctx.outputSpeech.push(responseMessage.outputSpeech + "<break time='1s'/>")

      Game.askQuestion(handlerInput, false);
      return responseBuilder.getResponse();
    }
  }
}

module.exports = gamePlayHandlers;