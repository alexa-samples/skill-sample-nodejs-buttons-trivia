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

const Alexa = require('alexa-sdk');
const settings = require('../config/settings.js');
const animations = require('../button_animations/animations.js');
const directives = require('./directives.js');
const UI = require('../dialog/uiprompts.js');
const logger = require('./logger.js');

module.exports = (function() {

    const DEFAULT_BUTTON_ANIMATION_DIRECTIVES = {
        'BUTTON_DOWN':
            directives.GadgetController.setButtonDownAnimation({
                'animations': animations.BasicAnimations.FadeOutAnimation(1, "blue", 200)
            }),
        'BUTTON_UP':
            directives.GadgetController.setButtonUpAnimation({
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
    
    /**
     *  Generates an input handler configuration, based on given number of players
     */
    const generateInputHandlerConfig = function({playerCount, timeout}) {
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
                "gadgetIds": [ proxyName ], 
                "action": "down" 
            };
            allButtonsRecognizerPattern.push(patternStep);
            if (numPlayer < (playerCount-1)) {
                // for all but the last player, add an intermediate recognizer                
                intermediateRecognizerPatterns.push(Array.of(patternStep));
            }
        } 
        
        /**
         *  create the input handler configuration object
         *  that defines the recognizers and events used for roll call 
         *  the full definition will be filled in dynamically
         */ 
        let inputHandlerConfig 
            = Object.assign({}, ROLL_CALL_INPUT_HANDLER_CONFIG_TEMPLATE);
        inputHandlerConfig.proxies = proxies;
        inputHandlerConfig.timeout = timeout;
        inputHandlerConfig.recognizers
            .roll_call_all_buttons.pattern = allButtonsRecognizerPattern;
    
        /**
         *  now fill in the dynamically generated recognizer and event
         *  definitions into the input handler configuration object
         */
        for (let i = 0; i < intermediateRecognizerPatterns.length; i++) {
            let name = 'roll_call_button_' + (1+i);
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
    }

    const isValidPlayerCount = function (count) {
        return (count <= settings.GAME.MAX_PLAYERS && count > 0)
    };

    const listenForRollCall = function ({ inputHandlerConfig }) {
        this.attributes.inputHandlerId = this.event.request.requestId;
        this.response._addDirective(directives.GameEngine.startInputHandler(inputHandlerConfig));
        
        // Send Pre-Roll Call Animation to all connected buttons
        this.response._addDirective(directives.GadgetController.setIdleAnimation({ 
            'animations': settings.ANIMATIONS.PRE_ROLL_CALL_ANIMATION 
        })); 
        // Send Button Down Event
        this.response._addDirective(directives.GadgetController.setButtonDownAnimation({ 
            'animations': settings.ANIMATIONS.ROLL_CALL_CHECKIN_ANIMATION 
        }));
    };

    const dispatchGameEngineEvents = function(inputEvents) {
        // try to process events in order of importance 
        // 1) first pass through to see if there are any non-timeout events
        for (let eventIndex = 0; eventIndex < inputEvents.length; eventIndex++) {            
            if ('roll_call_complete' === inputEvents[eventIndex].name) {
                return handleRollCallComplete.call(this, inputEvents[eventIndex]);
            } else if ('roll_call_button' === inputEvents[eventIndex].name.substring(0, 16)) {
                return handleRollCallButtonCheckIn.call(this, inputEvents[eventIndex]);             
            }
        }

        // 2) second pass through to see if there are any timeout events
        for (let eventIndex = 0; eventIndex < inputEvents.length; eventIndex++) {
            if (inputEvents[eventIndex].name == 'roll_call_timeout') {
                return handleRollCallTimeout.call(this, inputEvents[eventIndex]);
            }
        }

        // if neither first pass, nor second pass found any events, return null to triggere a DefaultHandler
        return null;
    };

    const handleRollCallComplete = function(inputEvent) {
        logger.log('DEBUG', 'RollCall: handle roll call complete: '
            + JSON.stringify(inputEvent));

        this.handler.state = settings.STATE.GAME_LOOP_STATE;
        this.attributes.STATE = settings.STATE.GAME_LOOP_STATE;
        this.attributes.rollCallComplete = true;  
        delete this.attributes.expectingEndSkillConfirmation;
                
        this.attributes.buttons = inputEvent.inputEvents
            .map((evt, idx) => { return { 
                    buttonId: evt.gadgetId, 
                    count: (1 + idx) 
                }; 
            });
        this.attributes.buttonCount = this.attributes.buttons.length;        
        // clear animations on all other buttons that haven't been added to the game
        this.response._addDirective(directives.GadgetController.setIdleAnimation({ 
            'animations': animations.BasicAnimations.SolidAnimation(1, "black", 100)
        }));
        // display roll call complete animation on all buttons that were added to the game
        this.response._addDirective(directives.GadgetController.setIdleAnimation({ 
            'targetGadgets': this.attributes.buttons.map(b => b.buttonId), 
            'animations': settings.ANIMATIONS.ROLL_CALL_COMPLETE_ANIMATION
        }));

        logger.log('DEBUG', 'RollCall: resuming game play, from question: '
            + this.attributes.currentQuestion);
        
        let currentPrompts;
        if (settings.ROLLCALL.NAMED_PLAYERS) {
            // tell the next player to press their button.        
            let uiPrompts = this.getUIPrompts({ key: 'ROLL_CALL_HELLO_PLAYER', 
                params: {
                    'player_number': this.attributes.buttonCount 
            }});
            currentPrompts = uiPrompts;
        }
                    
        let uiPrompts = this.getUIPrompts({
            key: 'ROLL_CALL_COMPLETE'
        });
        let mixedOutputSpeech = '';
        if (currentPrompts) {
            mixedOutputSpeech = currentPrompts.outputSpeech 
                            + settings.AUDIO.ROLL_CALL_COMPLETE + uiPrompts.outputSpeech;            
        } else {
            mixedOutputSpeech = settings.AUDIO.ROLL_CALL_COMPLETE + uiPrompts.outputSpeech;
        }

        this.response.speak(mixedOutputSpeech).listen(uiPrompts.reprompt);            
        this.display(uiPrompts);
        
        
        return { 'openMicrophone': true };
    };

    // handles the case when the roll call process times out before all players are checked in
    const handleRollCallTimeout = function() {
        logger.log('DEBUG', 'RollCall: handling time out event during roll call');
        // Reset button animation for all buttons
        this.response._addDirective(DEFAULT_BUTTON_ANIMATION_DIRECTIVES.BUTTON_DOWN);
        this.response._addDirective(DEFAULT_BUTTON_ANIMATION_DIRECTIVES.BUTTON_UP); 
    
        let {outputSpeech, reprompt} = this.getUIPrompts({
            key: 'ROLL_CALL_TIME_OUT'
        });
        this.response.speak(outputSpeech).listen(reprompt);
    
        this.handler.state = settings.STATE.ROLLCALL_EXIT_STATE;
    
        // Set flag that we're expecting end confirmation 
        //   this flag is used in the Yes/No intent disambiguation
        this.attributes.expectingEndSkillConfirmation = true;

        return { 'openMicrophone': true };
    };    

    const handleRollCallButtonCheckIn = function(inputEvent) {
        logger.log('DEBUG', 'RollCall: handle button press event: '
            + JSON.stringify(inputEvent));
        
        let buttonId = inputEvent.inputEvents[0].gadgetId;        

        let buttons = this.attributes.buttons || [];
        let buttonCount = buttons.length + 1;
        logger.log('DEBUG', 'Found a new button. New button count: ' + buttonCount);
        buttons.push({ count: buttonCount, buttonId: buttonId });
        this.attributes.buttons = buttons;
        this.attributes.buttonCount = buttons.length;

        return handlePlayerCheckedIn.call(this, {
            buttonId: buttonId,
            playerNumber: buttons.length,
            otherButtons: buttons
                .filter( b => b.buttonId !== buttonId)
                .map(b => b.buttonId)
        });
    };

    // handles a player checking in
    const handlePlayerCheckedIn = function({ buttonId, playerNumber, otherButtons }) {
        logger.log('DEBUG', 'RollCall: handle new player checked in: playerNumber = '
                        + playerNumber + ', buttonId = ' + buttonId);
                    
        this.response._addDirective(directives.GadgetController.setIdleAnimation({ 
            'targetGadgets': [ buttonId ],
            'animations': settings.ANIMATIONS.ROLL_CALL_BUTTON_ADDED_ANIMATION 
        }));
        this.response._addDirective(directives.GadgetController.setButtonDownAnimation({ 
            'targetGadgets': [ buttonId ],
            'animations': settings.ANIMATIONS.ROLL_CALL_CHECKIN_ANIMATION 
        }));

        if (settings.ROLLCALL.NAMED_PLAYERS) {
            // tell the next player to press their button.        
            let uiPrompts = this.getUIPrompts({ key: 'ROLL_CALL_HELLO_PLAYER', 
                params: {
                    'player_number': playerNumber 
            }});
            let currentPrompts = uiPrompts;
            uiPrompts = this.getUIPrompts({key: 'ROLL_CALL_NEXT_PLAYER_PROMPT', 
                params: {
                    'player_number': (playerNumber + 1)
            }});            
            this.response.speak(currentPrompts.outputSpeech 
                + "<break time='1s'/>" + uiPrompts.outputSpeech 
                + settings.AUDIO.WAITING_FOR_ROLL_CALL_AUDIO);
        }

        return { 'openMicrophone': false };
    };

    const resumeRollCall = function({ uiKey }) {
        logger.log('DEBUG', 'RollCall: resume roll call');
    
        listenForRollCall.call(this, {
            inputHandlerConfig: generateInputHandlerConfig({
                playerCount: this.attributes.playerCount, 
                /* allow 35 seconds for roll call to complete */
                timeout: 35000
            })
        });

        let uiPrompts = this.getUIPrompts({
            key: uiKey
        });
        this.display(uiPrompts);
        this.response.speak(uiPrompts.outputSpeech + settings.AUDIO.WAITING_FOR_ROLL_CALL_AUDIO);
        
        this.attributes.expectingEndSkillConfirmation  = false;
        this.attributes.buttons                        = [];
        this.attributes.buttonCount                    = 0;
        
        return { 'openMicrophone': false };
    };

    /** Exported Roll Call Functionality */
    return {        

        /**
         *   Exported method that resumes a Roll Call process.
         *   Typically called when an updated player count is available
         *   or, to resume roll call after Help is presented, or when 
         *   the game is started as a new session that previously had
         *   roll call completed.
         */ 
        'resume': function({ isNewSession, playerCount }) {
            delete this.attributes.expectingEndSkillConfirmation;                   

            // Check to see if value provided is within the range
            if (!isValidPlayerCount(playerCount)) {
                logger.log('DEBUG', 'playerCount: received invalid count = ' + playerCount);

                let {outputSpeech, reprompt} = this.getUIPrompts({
                    key: 'PLAYERCOUNT_INVALID'
                });
                this.response.speak(outputSpeech).listen(reprompt);
                return { 'openMicrophone': true };
            }
            else {
                logger.log('DEBUG', 'playerCount: received valid count =' + playerCount);

                // save the player count and reset button count and the buttons array
                this.attributes.playerCount = playerCount;            
                this.attributes.buttonCount = 0;
                this.attributes.buttons = [];

                resumeRollCall.call(this, {
                    uiKey: isNewSession ? 'ROLL_CALL_RESUME_GAME' : 'ROLL_CALL_CONTINUE'
                });
                return { 'openMicrophone': false };
            }
        },

        /**
         *  Exported method that cancels an in-progress roll call.
         */ 
        'cancel' : function() {
            logger.log('DEBUG', 'RollCall: canceling roll call');
            this.attributes.rollCallComplete = false;
            delete this.attributes.buttonCount;
            delete this.attributes.buttons;

            if (this.attributes.inputHandlerId) {
                // Stop the previous InputHandler if one was running
                this.response._addDirective(directives.GameEngine.stopInputHandler({ 
                    'id': this.attributes.inputHandlerId
                }));
            }
        },

        /**
         *  Exported method that initiates the process of Roll Call
         *  This method always starts a new Roll Call - regardless of whether a 
         *  roll call was in progress or not at the time it is called.
         */ 
        'start' : function() {
            logger.log('DEBUG', 'RollCall: starting roll call (resume = ' + this.attributes.resume + ')');
            
            let uiKey = 'START_ROLL_CALL'; 
            if ( 'resume' in this.attributes ) {
                // Indication that user either said yes or no to resuming a game
                if ( this.attributes.resume ) {
                    uiKey = 'RESUME_GAME';                
                } else {
                    uiKey = 'DONT_RESUME_GAME';                                
                }
            }

            let uiPrompts = this.getUIPrompts({ 
                key: uiKey
            });
            this.display(uiPrompts);
            this.response.speak(uiPrompts.outputSpeech).listen(uiPrompts.reprompt);

            // delete all attributes
            let attributeNames = Object.keys(this.attributes); 
            for (let k = 0; k < attributeNames.length; k++) {
                delete this.attributes[attributeNames[k]]; 
            }

            // Roll call has not completed, so lets save the state
            this.attributes.rollCallComplete                = false;
            this.attributes.expectingEndSkillConfirmation   = false;
            
            // Set state to Roll Call
            this.handler.state = settings.STATE.ROLLCALL_STATE;
            this.attributes.STATE = settings.STATE.ROLLCALL_STATE;         

            // Send an intro animation to all connected buttons
            this.response._addDirective(directives.GadgetController.setIdleAnimation({ 
                'animations': settings.ANIMATIONS.INTRO_ANIMATION 
            }));

            return { 'openMicrophone': true };
        },
        
        /**
         *   Exported GameEngine event handler.
         *   Should be called to receive all GameEngine InputHandlerEvents 
         */
        'handleEvents': function(inputEvents) {
            return dispatchGameEngineEvents.call(this, inputEvents);
        }      
    };
})();