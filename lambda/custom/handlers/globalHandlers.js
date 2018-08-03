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

const display = require('../utils/display.js');
const i18n = require('i18next');
const logger = require('../utils/logger.js');
const messages = require('../config/messages.js');
const settings = require('../config/settings.js');
const Game = require('../utils/game.js');
const RollCall = require('../utils/rollcall.js');

const globalHandlers = {
  RequestInterceptor: {
    async process(handlerInput) {
      logger.log('DEBUG', 'Global.RequestInterceptor: pre-processing response');
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      let ctx = attributesManager.getRequestAttributes();
      let persistentAtttributes = await attributesManager.getPersistentAttributes();
      let sessionAttributes = attributesManager.getSessionAttributes();

      /**
       * Ensure a state in case we're starting fresh
       */
      if (sessionAttributes.STATE == null) {
        logger.log('DEBUG', 'SETTING STATE TO DEFAULT');
        sessionAttributes.STATE = settings.STATE.DEFAULT_STATE;
      }

      // Apply the persistent attributes to the current session
      attributesManager.setSessionAttributes(Object.assign({}, persistentAtttributes, sessionAttributes));

      /**
       * Log the request for debug purposes.
       */
      logger.log('DEBUG', '----- REQUEST -----');
      logger.log('DEBUG', JSON.stringify(requestEnvelope, null, 2));

      /**
       * Ensure we're starting at a clean state.
       */
      ctx.directives = [];
      ctx.outputSpeech = [];
      ctx.reprompt = [];

      /**
       * For ease of use we'll attach the utilities for rendering display
       * and handling localized tts to the request attributes.
       */
      logger.log('DEBUG', 'Initializing messages for ' + handlerInput.requestEnvelope.request.locale);
      const localizationClient = i18n.init({
        lng: handlerInput.requestEnvelope.request.locale,
        resources: messages,
        returnObjects: true,
        fallbackLng: 'en'
      });
      ctx.t = function (...args) {
        return localizationClient.t(...args);
      };
      ctx.render = function (...args) {
        return display.render(...args);
      }
      logger.log('DEBUG', 'Global.RequestInterceptor: pre-processing response complete');
    }
  },
  ResponseInterceptor: {
    async process(handlerInput) {
      logger.log('DEBUG', 'Global.ResponseInterceptor: post-processing response');
      let {
        attributesManager,
        responseBuilder
      } = handlerInput;
      let ctx = attributesManager.getRequestAttributes();
      let sessionAttributes = attributesManager.getSessionAttributes();
      let persistentAtttributes = await attributesManager.getPersistentAttributes();
        
      /**
       * Log the attributes and response for debug purposes.
       */
      logger.log('DEBUG', '----- REQUEST ATTRIBUTES -----');
      logger.log('DEBUG', JSON.stringify(ctx, null, 2));

      logger.log('DEBUG', '----- SESSION ATTRIBUTES -----');
      logger.log('DEBUG', JSON.stringify(sessionAttributes, null, 2));

      logger.log('DEBUG', '----- CURRENT PERSISTENT ATTRIBUTES -----');
      logger.log('DEBUG', JSON.stringify(persistentAtttributes, null, 2));

      /**
       * Build the speech response.
       */
      if (ctx.outputSpeech.length > 0) {
        let outputSpeech = ctx.outputSpeech.join(' ');
        logger.log('DEBUG', 'Global.ResponseInterceptor: adding ' +
          ctx.outputSpeech.length + ' speech parts');
        responseBuilder.speak(outputSpeech);
      }
      if (ctx.reprompt.length > 0) {
        logger.log('DEBUG', 'Global.ResponseInterceptor: adding ' +
          ctx.outputSpeech.length + ' speech reprompt parts');
        let reprompt = ctx.reprompt.join(' ');
        responseBuilder.reprompt(reprompt);
      }

      /**
       * Add the display response
       */
      if (ctx.renderTemplate) {
        responseBuilder.addRenderTemplateDirective(ctx.renderTemplate);
      }

      let response = responseBuilder.getResponse();

      /**
       * Apply the custom directives to the response.
       */
      if (Array.isArray(ctx.directives)) {
        logger.log('DEBUG', 'Global.ResponseInterceptor: processing ' + ctx.directives.length + ' custom directives ');
        response.directives = response.directives || [];
        for (let i = 0; i < ctx.directives.length; i++) {
          response.directives.push(ctx.directives[i]);
        }
      }

      if ('openMicrophone' in ctx) {
        if (ctx.openMicrophone) {
          /**
           * setting shouldEndSession = false - lets Alexa know that we want an answer from the user
           * see: https://developer.amazon.com/docs/gadget-skills/receive-voice-input.html#open
           *      https://developer.amazon.com/docs/gadget-skills/keep-session-open.html
           */
          response.shouldEndSession = false;
          logger.log('DEBUG', 'Global.ResponseInterceptor: request to open microphone -> shouldEndSession = false');
        } else {
          if (ctx.endSession){
            // We have explicitely asked for the session to end
            response.shouldEndSession = true;
          } else {
            /**
             * deleting shouldEndSession will keep the skill session going,
             * while the input handler is active, waiting for button presses
             * see: https://developer.amazon.com/docs/gadget-skills/keep-session-open.html
             */
            delete response.shouldEndSession;
          }
          
          logger.log('DEBUG', 'Global.ResponseInterceptor: request to open microphone -> delete shouldEndSession');
        }
      }

      /**
       * Persist the current session attributes
       */
      attributesManager.setPersistentAttributes(sessionAttributes);
      await attributesManager.savePersistentAttributes();
      logger.log('DEBUG', '----- NEW PERSISTENT ATTRIBUTES -----');
      logger.log('DEBUG', JSON.stringify(persistentAtttributes, null, 2));

      /**
       * Log the attributes and response for debug purposes.
       */
      logger.log('DEBUG', '----- RESPONSE -----');
      logger.log('DEBUG', JSON.stringify(response, null, 2));

      return response;
    }
  },
  DefaultHandler: {
    canHandle(handlerInput) {
      logger.log('DEBUG', 'Global.DefaultHandler: canHandle');

      /**
       * Catch all for requests.
       */
      return true;
    },
    handle(handlerInput) {
      logger.log('DEBUG', 'Global.DefaultHandler: handle');
      let {
        attributesManager,
        responseBuilder
      } = handlerInput;
      let ctx = attributesManager.getRequestAttributes();
      let {
        outputSpeech,
        reprompt
      } = ctx.t('UNHANDLED_REQUEST');

      ctx.outputSpeech.push(outputSpeech);
      ctx.reprompt.push(reprompt);
      ctx.openMicrophone = true;

      return responseBuilder.getResponse();
    }
  },
  StartNewGameHandler: {
    canHandle(handlerInput) {
      logger.log('DEBUG', 'Global.StartNewGameHandler: canHandle');
      let request = handlerInput.requestEnvelope.request;
      return request.type === 'IntentRequest' &&
        request.intent.name === 'AMAZON.StartOverIntent';
    },
    handle(handlerInput) {
      logger.log('DEBUG', 'Global.StartNewGameHandler: handle');
      let {
        attributesManager,
        responseBuilder
      } = handlerInput;
      let sessionAttributes = attributesManager.getSessionAttributes();

      sessionAttributes.resume = false;
      sessionAttributes.currentQuestion = 0;
      delete sessionAttributes.buttons;
      delete sessionAttributes.correct;
      delete sessionAttributes.answeringButton;
      delete sessionAttributes.answeringPlayer;
      delete sessionAttributes.waitingForAnswer;

      RollCall.start(handlerInput);
      return responseBuilder.getResponse();
    }
  },
  HelpHandler: {
    canHandle(handlerInput) {
      logger.log('DEBUG', 'Global.HelpHandler: canHandle');
      /**
       * Handle all help requests and treat don't know requests as
       * help requests except when in game loop state
       */
      let {
        attributesManager,
        requestEnvelope
      } = handlerInput;
      let request = requestEnvelope.request;
      let sessionAttributes = attributesManager.getSessionAttributes();
      return request.type === 'IntentRequest' &&
        (request.intent.name === 'AMAZON.HelpIntent' ||
        (request.intent.name === 'DontKnowIntent' &&
        sessionAttributes.STATE !== settings.STATE.GAME_LOOP_STATE))
    },
    handle(handlerInput) {
      logger.log('DEBUG', 'Global.HelpHandler: handle');
      let {
        attributesManager,
        responseBuilder
      } = handlerInput;
      let ctx = attributesManager.getRequestAttributes();
      let sessionAttributes = attributesManager.getSessionAttributes();

      /**
       * Figure out where we need help
       */
      let messageKey;
      switch (sessionAttributes.STATE) {
        case settings.STATE.ROLLCALL_STATE:
          messageKey = 'ROLL_CALL_HELP';
          break;
        case settings.STATE.ROLLCALL_EXIT_STATE:
          messageKey = 'ROLL_CALL_EXIT_HELP';
          break;
        case settings.STATE.GAME_LOOP_STATE:
          messageKey = 'GAME_PLAY_HELP';
          // Clean up the in game state if they interrupted for help
          Game.stopCurrentInputHandler(handlerInput);
          delete sessionAttributes.answeringButton;
          delete sessionAttributes.answeringPlayer;
          delete sessionAttributes.correct;
          break;
        default:
          messageKey = 'GENERAL_HELP'
      }

      let responseMessage = ctx.t(messageKey);
      ctx.render(handlerInput, responseMessage);
      ctx.outputSpeech.push(responseMessage.outputSpeech);
      ctx.reprompt.push(responseMessage.reprompt);
      ctx.openMicrophone = true;

      return responseBuilder.getResponse();
    }
  },
  SessionEndedRequestHandler: {
    canHandle(handlerInput) {
      logger.log('DEBUG', 'Global.SessionEndedRequestHandler: canHandle');
      return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
      logger.log('DEBUG', 'Global.SessionEndedRequestHandler: handle');
      logger.log('INFO', `Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
      let {
        attributesManager,
        responseBuilder
      } = handlerInput;
      let sessionAttributes = attributesManager.getSessionAttributes();

      /**
       * Clean out the session attributes that won't be persisted
       */
      delete sessionAttributes.expectingEndSkillConfirmation;
      delete sessionAttributes.resume;
      delete sessionAttributes.STATE;

      /**
       *  setting shouldEndSession = true  -  lets Alexa know that the skill is done
       *  see: https://developer.amazon.com/docs/gadget-skills/receive-voice-input.html
       */
      let response = responseBuilder.getResponse();
      response.shouldEndSession = true;
      return response;
    }
  },
  ErrorHandler: {
    canHandle() {
      // Handle all errors. We'll just log them.
      logger.log('DEBUG', 'Global.ErrorHandler: canHandle');
      return true;
    },
    handle(handlerInput, error) {
      logger.log('DEBUG', 'Global.ErrorHandler: handle');
      logger.log('ERROR', 'Global.ErrorHandler: Error = ' + error.message);
      logger.log('ERROR', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

      return handlerInput.responseBuilder
        .speak('An error was encountered while handling your request. Try again later')
        .getResponse();
    }
  }
}

module.exports = globalHandlers;