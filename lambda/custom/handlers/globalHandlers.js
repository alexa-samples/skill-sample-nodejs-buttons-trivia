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

const globalHandlers = {
  RequestInterceptor: {
    async process(handlerInput) {
      logger.debug('Global.RequestInterceptor: pre-processing response');
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
        logger.debug('SETTING STATE TO START_GAME_STATE');
        sessionAttributes.STATE = settings.STATE.START_GAME_STATE;
      } else if (sessionAttributes.STATE === '_GAME_LOOP'){
        logger.debug('Changing state from _GAME_LOOP for backward compatability.')
        sessionAttributes.STATE = settings.STATE.BUTTON_GAME_STATE;
      }

      // Apply the persistent attributes to the current session
      attributesManager.setSessionAttributes(Object.assign({}, persistentAtttributes, sessionAttributes));

      /**
       * Log the request for debug purposes.
       */
      logger.debug('----- REQUEST -----');
      logger.debug(JSON.stringify(requestEnvelope, null, 2));

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
      logger.debug('Initializing messages for ' + handlerInput.requestEnvelope.request.locale);
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
      logger.debug('Global.RequestInterceptor: pre-processing response complete');
    }
  },
  ResponseInterceptor: {
    async process(handlerInput) {
      logger.debug('Global.ResponseInterceptor: post-processing response');
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
      logger.debug('----- REQUEST ATTRIBUTES -----');
      logger.debug(JSON.stringify(ctx, null, 2));

      logger.debug('----- SESSION ATTRIBUTES -----');
      logger.debug(JSON.stringify(sessionAttributes, null, 2));

      logger.debug('----- CURRENT PERSISTENT ATTRIBUTES -----');
      logger.debug(JSON.stringify(persistentAtttributes, null, 2));

      /**
       * Build the speech response.
       */
      if (ctx.outputSpeech.length > 0) {
        let outputSpeech = ctx.outputSpeech.join(' ');
        logger.debug('Global.ResponseInterceptor: adding ' +
          ctx.outputSpeech.length + ' speech parts');
        responseBuilder.speak(outputSpeech);
      }
      if (ctx.reprompt.length > 0) {
        logger.debug('Global.ResponseInterceptor: adding ' +
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
        logger.debug('Global.ResponseInterceptor: processing ' + ctx.directives.length + ' custom directives ');
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
          logger.debug('Global.ResponseInterceptor: request to open microphone -> shouldEndSession = false');
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

          logger.debug('Global.ResponseInterceptor: request to open microphone -> delete shouldEndSession');
        }
      }

      /**
       * Persist the current session attributes
       */
      attributesManager.setPersistentAttributes(sessionAttributes);
      await attributesManager.savePersistentAttributes();
      logger.debug('----- NEW PERSISTENT ATTRIBUTES -----');
      logger.debug(JSON.stringify(persistentAtttributes, null, 2));

      /**
       * Log the attributes and response for debug purposes.
       */
      logger.debug('----- RESPONSE -----');
      logger.debug(JSON.stringify(response, null, 2));

      return response;
    }
  },
  DefaultHandler: {
    canHandle(handlerInput) {
      logger.debug('Global.DefaultHandler: canHandle');

      /**
       * Catch all for requests.
       */
      return true;
    },
    handle(handlerInput) {
      logger.debug('Global.DefaultHandler: handle');
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
  HelpHandler: {
    canHandle(handlerInput) {
      logger.debug('Global.HelpHandler: canHandle');
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
        sessionAttributes.STATE !== settings.STATE.BUTTON_GAME_STATE &&
        sessionAttributes.STATE !== settings.STATE.BUTTONLESS_GAME_STATE))
    },
    handle(handlerInput) {
      logger.debug('Global.HelpHandler: handle');
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
        case settings.STATE.BUTTON_GAME_STATE:
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
  /**
   * Stop and Cancel both respond by saying goodbye and ending the session by not setting openMicrophone
   */
  StopCancelHandler: {
    canHandle(handlerInput) {
      logger.debug('Global.StopCancelHandler: canHandle');
      return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
        (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent' ||
        handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent')
    },
    handle(handlerInput) {
      logger.debug('Global.StopCancelHandler: handle');
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
  SessionEndedRequestHandler: {
    canHandle(handlerInput) {
      logger.debug('Global.SessionEndedRequestHandler: canHandle');
      return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
      logger.debug('Global.SessionEndedRequestHandler: handle');
      logger.info(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
      let {
        attributesManager,
        responseBuilder
      } = handlerInput;
      let sessionAttributes = attributesManager.getSessionAttributes();

      /**
       * Clean out the session attributes that won't be persisted
       */
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
      logger.debug('Global.ErrorHandler: canHandle');
      return true;
    },
    handle(handlerInput, error) {
      logger.debug('Global.ErrorHandler: handle');
      logger.error('Global.ErrorHandler: Error = ' + error.message);
      logger.error(JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

      return handlerInput.responseBuilder
        .speak('An error was encountered while handling your request. Try again later')
        .getResponse();
    }
  }
}

module.exports = globalHandlers;