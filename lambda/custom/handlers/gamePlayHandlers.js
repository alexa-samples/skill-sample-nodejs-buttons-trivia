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
 * Handling everything for the BUTTON_GAME_STATE state.
 */
const gamePlayHandlers = {
  /**
   * The player has responded 'stop', 'cancel', 'no', requesting the game end.
   */
  EndGameHandler: {
    canHandle(handlerInput) {
      logger.debug('GAME.EndGameHandler: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'IntentRequest' &&
          (requestEnvelope.request.intent.name === 'AMAZON.StopIntent' ||
          requestEnvelope.request.intent.name === 'AMAZON.CancelIntent' ||
          requestEnvelope.request.intent.name === 'AMAZON.NoIntent') &&
        (attributesManager.getSessionAttributes().STATE === settings.STATE.BUTTON_GAME_STATE ||
        attributesManager.getSessionAttributes().STATE === settings.STATE.BUTTONLESS_GAME_STATE);
    },
    handle(handlerInput) {
      logger.debug('GAME.EndGameHandler: handle');
      Game.endGame(handlerInput, false);
      return handlerInput.responseBuilder.getResponse();
    }
  },
  /**
   * Events from the game engine
   */
  GameEventHandler: {
    canHandle(handlerInput) {
      logger.debug('GAME.GameEventHandler: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'GameEngine.InputHandlerEvent' &&
        attributesManager.getSessionAttributes().STATE === settings.STATE.BUTTON_GAME_STATE;
    },
    handle(handlerInput) {
      logger.debug('GAME.GameEventHandler: handle');
      Game.handleGameInputEvent(handlerInput);
      return handlerInput.responseBuilder.getResponse();
    }
  },
  /**
   * The player has asked to play a game while in the middle of a game, continue on
   */
  PlayGameHandler: {
    canHandle(handlerInput) {
      logger.debug('GAME.PlayGameHandler: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'IntentRequest' &&
        requestEnvelope.request.intent.name === 'PlayGame' &&
        (attributesManager.getSessionAttributes().STATE === settings.STATE.BUTTON_GAME_STATE ||
        attributesManager.getSessionAttributes().STATE === settings.STATE.BUTTONLESS_GAME_STATE);
    },
    handle(handlerInput) {
      logger.debug('GAME.PlayGameHandler: handle');
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
   * Player has responded 'yes' to being ready to start the game
   */
  YesHandler: {
    canHandle(handlerInput) {
      logger.debug('GAME.YesHandler: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'IntentRequest' &&
        requestEnvelope.request.intent.name === 'AMAZON.YesIntent' &&
        (attributesManager.getSessionAttributes().STATE === settings.STATE.BUTTON_GAME_STATE ||
        attributesManager.getSessionAttributes().STATE === settings.STATE.BUTTONLESS_GAME_STATE);
    },
    handle(handlerInput) {
      logger.debug('GAME.YesHandler: handle');

      Game.askQuestion(handlerInput, false);
      return handlerInput.responseBuilder.getResponse();
    }
  },
  /**
   * The player is answering a question.
   */
  AnswerHandler: {
    canHandle(handlerInput) {
      logger.debug('GAME.AnswerHandler: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'IntentRequest' &&
        (requestEnvelope.request.intent.name === 'AnswerQuestionIntent' ||
          requestEnvelope.request.intent.name === 'AnswerOnlyIntent') &&
          (attributesManager.getSessionAttributes().STATE === settings.STATE.BUTTON_GAME_STATE ||
          attributesManager.getSessionAttributes().STATE === settings.STATE.BUTTONLESS_GAME_STATE);
    },
    handle(handlerInput) {
      logger.debug('GAME.AnswerHandler: handle');
      Game.answerQuestion(handlerInput);
      return handlerInput.responseBuilder.getResponse();
    }
  },
  /**
   * The player has responded 'don't know', 'next', or similar.
   */
  DontKnowNextHandler: {
    canHandle(handlerInput) {
      logger.debug('GAME.DontKnowNextHandler: canHandle');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      return requestEnvelope.request.type === 'IntentRequest' &&
        (requestEnvelope.request.intent.name === 'DontKnowIntent' ||
          requestEnvelope.request.intent.name === 'AMAZON.NextIntent') &&
          (attributesManager.getSessionAttributes().STATE === settings.STATE.BUTTON_GAME_STATE ||
          attributesManager.getSessionAttributes().STATE === settings.STATE.BUTTONLESS_GAME_STATE);
    },
    handle(handlerInput) {
      logger.debug('GAME.DontKnowNextHandler: handle');
      let { attributesManager, responseBuilder } = handlerInput;
      let sessionAttributes = attributesManager.getSessionAttributes();
      let ctx = attributesManager.getRequestAttributes();

      sessionAttributes.currentQuestion = parseInt(sessionAttributes.currentQuestion || 0, 10) + 1;

      let isLastQuestion = parseInt(sessionAttributes.currentQuestion || 1, 10) > settings.GAME.QUESTIONS_PER_GAME;
      let messageKey = isLastQuestion ? 'PLAY_GAME_SKIP_LAST_QUESTION' : 'PLAY_GAME_SKIP_QUESTION';
      let responseMessage = ctx.t(messageKey, sessionAttributes.currentQuestion);
      ctx.outputSpeech.push(responseMessage.outputSpeech + "<break time='1s'/>");

      Game.askQuestion(handlerInput, false);
      return responseBuilder.getResponse();
    }
  }
}

module.exports = gamePlayHandlers;