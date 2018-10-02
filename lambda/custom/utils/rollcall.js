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

const settings = require('../config/settings.js');
const animations = require('./animations.js');
const directives = require('./directives.js');
const logger = require('./logger.js');

const DEFAULT_BUTTON_ANIMATION_DIRECTIVES = {
  'BUTTON_DOWN': directives.GadgetController.setButtonDownAnimation({
    'animations': animations.BasicAnimations.FadeOutAnimation(1, "blue", 200)
  }),
  'BUTTON_UP': directives.GadgetController.setButtonUpAnimation({
    'animations': animations.BasicAnimations.SolidAnimation(1, "black", 100)
  })
};

/**
 * A template input handler configuration that will be
 * used as a starting point for the roll call input handler.
 *
 * The final configuration is dynamically generated.
 */
const ROLL_CALL_INPUT_HANDLER_CONFIG_TEMPLATE = {
  'timeout': 1000,
  'proxies': [],
  'recognizers': {
    'roll_call_all_buttons': {
      "type": "match",
      "fuzzy": true,
      "anchor": "end",
      "pattern": []
    }
  },
  'events': {
    'roll_call_complete': {
      'meets': ['roll_call_all_buttons'],
      'reports': 'matches',
      'shouldEndInputHandler': true,
      'maximumInvocations': 1
    },
    'roll_call_timeout': {
      'meets': ['timed out'],
      'reports': 'history',
      'shouldEndInputHandler': true
    }
  }
};

const rollCallHelper = {
  /**
   *  Generates an input handler configuration, based on given number of players
   */
  generateInputHandlerConfig: function ({
    playerCount,
    timeout
  }) {
    logger.debug('ROLLCALL_HELPER: generate input handler config');

    playerCount = parseInt(playerCount || 1, 10);

    /**
     * For roll call we will use a list of proxies because we won't
     * know the Id of any of the buttons ahead of time.
     * The proxies will be filld out dynamically in a loop below.
     */
    let proxies = [];

    /**
     *  create a recognizer pattern that matches once when all
     *  the buttons have been pressed at least once.
     */
    let allButtonsRecognizerPattern = [];

    /**
     *  create intermediate recognizers, one for first button,
     *  one for second button, etc. that will match when each
     *  of the buttons is pressed the first time (identifed by
     *  proxy)
     */
    let intermediateRecognizerPatterns = [];

    /**
     *  set up the proxies and recognizer patterns dynamically
     *  based on the number of players.
     */
    for (let numPlayer = 0; numPlayer < playerCount; numPlayer++) {
      let proxyName = 'btn' + (1 + numPlayer);
      proxies.push(proxyName);
      let patternStep = {
        "gadgetIds": [proxyName],
        "action": "down"
      };
      allButtonsRecognizerPattern.push(patternStep);
      if (numPlayer < (playerCount - 1)) {
        // for all but the last player, add an intermediate recognizer
        intermediateRecognizerPatterns.push(Array.of(patternStep));
      }
    }

    /**
     *  create the input handler configuration object
     *  that defines the recognizers and events used for roll call
     *  the full definition will be filled in dynamically
     */
    let inputHandlerConfig = Object.assign({}, ROLL_CALL_INPUT_HANDLER_CONFIG_TEMPLATE);
    inputHandlerConfig.proxies = proxies;
    inputHandlerConfig.timeout = timeout;
    inputHandlerConfig.recognizers
      .roll_call_all_buttons.pattern = allButtonsRecognizerPattern;

    /**
     *  now fill in the dynamically generated recognizer and event
     *  definitions into the input handler configuration object
     */
    for (let i = 0; i < intermediateRecognizerPatterns.length; i++) {
      let name = 'roll_call_button_' + (1 + i);
      inputHandlerConfig.recognizers[name] = {
        "type": "match",
        "fuzzy": true,
        "anchor": "end",
        /* each intermediate event has a corresponding recognizer */
        "pattern": intermediateRecognizerPatterns[i]
      }
      inputHandlerConfig.events[name] = {
        'meets': [name],
        'reports': 'matches',
        /* intermediate events don't stop the input handler! */
        'shouldEndInputHandler': false,
        'maximumInvocations': 1
      }
    }

    return inputHandlerConfig;
  },

  listenForRollCall: function (handlerInput, inputHandlerConfig) {
    logger.debug('ROLLCALL_HELPER: listen for roll call');
    let ctx = handlerInput.attributesManager.getRequestAttributes();
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    sessionAttributes.inputHandlerId = handlerInput.requestEnvelope.request.requestId;
    ctx.directives.push(directives.GameEngine.startInputHandler(inputHandlerConfig));

    // Send Pre-Roll Call Animation to all connected buttons
    ctx.directives.push(directives.GadgetController.setIdleAnimation({
      'animations': settings.ANIMATIONS.PRE_ROLL_CALL_ANIMATION
    }));
    // Send Button Down Event
    ctx.directives.push(directives.GadgetController.setButtonDownAnimation({
      'animations': settings.ANIMATIONS.ROLL_CALL_CHECKIN_ANIMATION
    }));
  },

  dispatchGameEngineEvents: function (handlerInput, inputEvents) {
    logger.debug('ROLLCALL_HELPER: dispatch game engine events');
    // try to process events in order of importance
    // 1) first pass through to see if there are any non-timeout events
    for (let eventIndex = 0; eventIndex < inputEvents.length; eventIndex++) {
      if ('roll_call_complete' === inputEvents[eventIndex].name) {
        rollCallHelper.handleRollCallComplete(handlerInput, inputEvents[eventIndex]);
      } else if ('roll_call_button' === inputEvents[eventIndex].name.substring(0, 16)) {
        rollCallHelper.handleRollCallButtonCheckIn(handlerInput, inputEvents[eventIndex]);
      }
    }

    // 2) second pass through to see if there are any timeout events
    for (let eventIndex = 0; eventIndex < inputEvents.length; eventIndex++) {
      if (inputEvents[eventIndex].name == 'roll_call_timeout') {
        rollCallHelper.handleRollCallTimeout(handlerInput);
      }
    }
  },

  handleRollCallComplete: function (handlerInput, inputEvent) {
    logger.debug('ROLLCALL_HELPER: handle roll call complete: ' +
      JSON.stringify(inputEvent));
    let ctx = handlerInput.attributesManager.getRequestAttributes();
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    // Move to the button game state to begin the game
    sessionAttributes.STATE = settings.STATE.BUTTON_GAME_STATE;

    sessionAttributes.buttons = inputEvent.inputEvents
      .map((evt, idx) => {
        return {
          buttonId: evt.gadgetId,
          count: (1 + idx)
        };
      });
    // clear animations on all other buttons that haven't been added to the game
    ctx.directives.push(directives.GadgetController.setIdleAnimation({
      'animations': animations.BasicAnimations.SolidAnimation(1, "black", 100)
    }));
    // display roll call complete animation on all buttons that were added to the game
    ctx.directives.push(directives.GadgetController.setIdleAnimation({
      'targetGadgets': sessionAttributes.buttons.map(b => b.buttonId),
      'animations': settings.ANIMATIONS.ROLL_CALL_COMPLETE_ANIMATION
    }));

    logger.debug('RollCall: resuming game play, from question: ' +
      sessionAttributes.currentQuestion);

    let currentPrompts;
    if (settings.ROLLCALL.NAMED_PLAYERS) {
      // tell the next player to press their button.
      let responseMessage = ctx.t('ROLL_CALL_HELLO_PLAYER', {
        player_number: sessionAttributes.buttons.length
      });
      currentPrompts = responseMessage;
    }

    let responseMessage = ctx.t('ROLL_CALL_COMPLETE', sessionAttributes.buttons.length);
    let mixedOutputSpeech = '';
    if (currentPrompts) {
      mixedOutputSpeech = currentPrompts.outputSpeech +
        settings.AUDIO.ROLL_CALL_COMPLETE + settings.pickRandom(responseMessage.outputSpeech);
    } else {
      mixedOutputSpeech = settings.AUDIO.ROLL_CALL_COMPLETE + settings.pickRandom(responseMessage.outputSpeech);
    }

    ctx.render(handlerInput, responseMessage);
    ctx.outputSpeech.push(mixedOutputSpeech);
    ctx.reprompt.push(responseMessage.reprompt);
    ctx.openMicrophone = true;
  },

  // handles the case when the roll call process times out before all players are checked in
  handleRollCallTimeout: function (handlerInput) {
    logger.debug('ROLLCALL_HELPER: handling time out event during roll call');
    let ctx = handlerInput.attributesManager.getRequestAttributes();
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    // Reset button animation for all buttons
    ctx.directives.push(DEFAULT_BUTTON_ANIMATION_DIRECTIVES.BUTTON_DOWN);
    ctx.directives.push(DEFAULT_BUTTON_ANIMATION_DIRECTIVES.BUTTON_UP);

    let responseMessage = ctx.t('ROLL_CALL_TIME_OUT');
    ctx.outputSpeech.push(responseMessage.outputSpeech);
    ctx.reprompt.push(responseMessage.reprompt);
    ctx.openMicrophone = true;
  },

  handleRollCallButtonCheckIn: function (handlerInput, inputEvent) {
    logger.debug('ROLLCALL_HELPER: handle button press event: ' +
      JSON.stringify(inputEvent));
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    let buttonId = inputEvent.inputEvents[0].gadgetId;
    let buttons = sessionAttributes.buttons || [];

    // Failsafe - Check to see if we already have this button registered and if so skip registration
    for (let buttonIndex = 0; buttonIndex < buttons.length; buttonIndex++) {
      if (buttons[buttonIndex].buttonId === buttonId){
        logger.debug('This button is already registered. GadgetId=' + buttonId);
        return;
      }
    }

    let buttonNumber = buttons.length + 1;
    logger.debug('Found a new button. New button number: ' + buttonNumber);
    buttons.push({
      count: buttonNumber,
      buttonId: buttonId
    });
    sessionAttributes.buttons = buttons;

    rollCallHelper.handlePlayerCheckedIn(handlerInput, buttonId, buttons.length);
  },

  // handles a player checking in
  handlePlayerCheckedIn: function (handlerInput, buttonId, playerNumber) {
    logger.debug('ROLLCALL_HELPER: handle new player checked in: playerNumber = ' +
      playerNumber + ', buttonId = ' + buttonId);
    let ctx = handlerInput.attributesManager.getRequestAttributes();

    ctx.directives.push(directives.GadgetController.setIdleAnimation({
      'targetGadgets': [buttonId],
      'animations': settings.ANIMATIONS.ROLL_CALL_BUTTON_ADDED_ANIMATION
    }));
    ctx.directives.push(directives.GadgetController.setButtonDownAnimation({
      'targetGadgets': [buttonId],
      'animations': settings.ANIMATIONS.ROLL_CALL_CHECKIN_ANIMATION
    }));

    if (settings.ROLLCALL.NAMED_PLAYERS) {
      // tell the next player to press their button.
      let responseMessage = ctx.t('ROLL_CALL_HELLO_PLAYER', {
        player_number: playerNumber
      });
      let currentPrompts = responseMessage;
      responseMessage = ctx.t('ROLL_CALL_NEXT_PLAYER_PROMPT', {
        player_number: playerNumber + 1
      });
      ctx.outputSpeech.push(currentPrompts.outputSpeech);
      ctx.outputSpeech.push("<break time='1s'/>");
      ctx.outputSpeech.push(responseMessage.outputSpeech);
      ctx.outputSpeech.push(settings.AUDIO.WAITING_FOR_ROLL_CALL_AUDIO);
    }
    ctx.openMicrophone = false;
  },

  startRollCall: function (handlerInput, messageKey) {
    logger.debug('ROLLCALL_HELPER: resume roll call');
    let ctx = handlerInput.attributesManager.getRequestAttributes();
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    let inputHandlerConfig = rollCallHelper.generateInputHandlerConfig({
      playerCount: sessionAttributes.playerCount,
      /* allow 35 seconds for roll call to complete */
      timeout: 35000
    });
    rollCallHelper.listenForRollCall(handlerInput, inputHandlerConfig);

    let responseMessage = ctx.t(messageKey);
    ctx.render(handlerInput, responseMessage);
    ctx.outputSpeech.push(responseMessage.outputSpeech);
    ctx.outputSpeech.push(settings.AUDIO.WAITING_FOR_ROLL_CALL_AUDIO);
    ctx.openMicrophone = true;

    sessionAttributes.buttons = [];
  }
}

const RollCall = {
  /**
   *   Exported method that starts Roll Call.
   */
  start: function (handlerInput, resumingGame, playerCount) {
    logger.debug('ROLLCALL: start roll call');
    let ctx = handlerInput.attributesManager.getRequestAttributes();
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    sessionAttributes.STATE = settings.STATE.ROLLCALL_STATE;
    sessionAttributes.playerCount = playerCount;
    sessionAttributes.buttons = [];
    ctx.openMicrophone = false;

    let messageKey = resumingGame ? 'ROLL_CALL_RESUME_GAME' : 'ROLL_CALL_CONTINUE';
    rollCallHelper.startRollCall(handlerInput, messageKey);
  },

  /**
   *  Exported method that cancels an in-progress roll call.
   */
  cancel: function (handlerInput) {
    logger.debug('ROLLCALL: canceling roll call');
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    delete sessionAttributes.buttons;
    if (sessionAttributes.inputHandlerId) {
      // Stop the previous InputHandler if one was running
      let ctx = attributesManager.getRequestAttributes();
      ctx.directives.push(directives.GameEngine.stopInputHandler({
        'id': sessionAttributes.inputHandlerId
      }));
    }
  },

  /**
   *   Exported GameEngine event handler.
   *   Should be called to receive all GameEngine InputHandlerEvents
   */
  handleEvents: function (handlerInput, inputEvents) {
    return rollCallHelper.dispatchGameEngineEvents(handlerInput, inputEvents);
  }
};
module.exports = RollCall;