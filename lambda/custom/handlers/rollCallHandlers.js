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
const Alexa             = require('alexa-sdk');
const UI                = require('../dialog/uiprompts.js');
const RollCall          = require('../utils/rollcall.js'); 
const logger            = require('../utils/logger.js');
const settings          = require('../config/settings.js');


/**
 * ROLLCALL_STATE
 */
const rollCallHandlers = Alexa.CreateStateHandler(settings.STATE.ROLLCALL_STATE, {
    'LaunchRequest' : function(){
        logger.log('DEBUG', 'STATES.ROLLCALL_STATE - LaunchRequest');
        this.handler.state = settings.STATE.DEFAULT_STATE;
        this.emit('NewSession');
    },
    'PlayGame' : function(){   
        logger.log('DEBUG', 'STATES.ROLLCALL_STATE - PlayGame');     
        this.emit('PlayGame', 'ASK_TO_RESUME');
    },
    'StartNewGameIntent' : function() {
        logger.log('DEBUG', 'STATES.ROLLCALL_STATE - StartNewGameIntent');                
        this.emit('StartNewGameIntent');
    },
    'DontKnowIntent': function() {
        logger.log('DEBUG', "STATES.ROLLCALL_STATE - DontKnowIntent");         
        this.emitWithState('AMAZON.HelpIntent');
    },
    'AMAZON.HelpIntent': function() {
        logger.log('DEBUG', "STATES.ROLLCALL_STATE - AMAZON.HelpIntent");
        RollCall.cancel.call(this);
        let uiPrompts = this.getUIPrompts({ 
            key: 'ROLL_CALL_HELP'
        });
        this.response.speak(uiPrompts.outputSpeech).listen(uiPrompts.reprompt);
        this.display(uiPrompts);        
        this.emit('GlobalResponseReady', { 'openMicrophone': true });
    },
    'AMAZON.StopIntent': function() {
        logger.log('DEBUG', "STATES.ROLLCALL_STATE - AMAZON.StopIntent");
        let {outputSpeech, reprompt} = this.getUIPrompts({
            key: 'GOOD_BYE'
        });
        this.response.speak(outputSpeech);
        this.emit('GlobalResponseReady', { 'openMicrophone': false, 'endSession': true });
    },    
    'AMAZON.CancelIntent': function() {
        logger.log('DEBUG', 'STATES.ROLLCALL_STATE - AMAZON.CancelIntent');        
        this.emitWithState('AMAZON.StopIntent');
    },
    'PlayerCount' : function() {
        logger.log('DEBUG', 'STATES.ROLLCALL_STATE - PlayerCount');
        this.attributes.rollCallComplete = false;
        let playerCount = this.event.request.intent.slots.players ?
            parseInt(this.event.request.intent.slots.players.value, 10) : 0;
        let responseOptions = RollCall.resume.call(this, { 
            isNewSession: false,
            playerCount: playerCount
        });
        this.emit('GlobalResponseReady', responseOptions);
    },
    'AnswerQuestionIntent' : function() {
        logger.log('DEBUG', 'STATES.ROLLCALL_STATE - AnswerQuestionIntent');
        let shouldRestartRollCall = !('playerCount' in this.attributes) 
            || !('inputHandlerId' in this.attributes);            
        let uiPrompts = this.getUIPrompts({
            key: shouldRestartRollCall ? 'START_ROLL_CALL' : 'ANSWER_DURING_ROLLCALL'
        });            
        this.response.speak(uiPrompts.outputSpeech);
        this.emit('GlobalResponseReady', { 'openMicrophone': shouldRestartRollCall, 'endSession': false });
    },
    'AnswerOnlyIntent' : function() {
        logger.log('DEBUG', 'STATES.ROLLCALL_STATE - AnswerOnlyIntent');        
        this.emitWithState('AnswerQuestionIntent');
    },
    'GameEngine.InputHandlerEvent' : function() {
        logger.log('DEBUG', 'STATES.ROLLCALL_STATE - GameEngine.InputHandlerEvent');
        let inputEvents = this.event.request.events;
        let responseOptions = RollCall.handleEvents.call(this, inputEvents);
        
        if (responseOptions) {
            this.emit('GlobalResponseReady', responseOptions);
        } else {        
            // if no response options provided, something went wrong in the roll call event handler
            this.emit('GlobalDefaultHandler'); 
        }                  
    },
    // in roll call mode and they answered they want to resume
    'AMAZON.YesIntent' : function() {
        logger.log('DEBUG', 'STATES.ROLLCALL_STATE - AMAZON.YesIntent');        
        if (!!this.attributes.rollCallComplete) {
            this.attributes.rollCallComplete
                = (this.attributes.playerCount === this.attributes.buttonCount
                && this.attributes.buttons
                && this.attributes.buttons.length === this.attributes.buttonCount);
            logger.log('DEBUG', 'Determined that rollCall status is ' + 
                (this.attributes.rollCallComplete ? 'COMPLETE' : 'IN-PROGRESS' ));
        } 
        
        // resume roll call
        this.attributes.resume = true;
        if (this.attributes.playerCount > 0) {
            logger.log('DEBUG', 'Resume roll call. We know the number of players: ' 
                    + this.attributes.playerCount);
            // resume game play from a previous game
            if (!this.attributes.currentQuestion) {
                this.attributes.currentQuestion = 1;
            }

            let responseOptions = RollCall.resume.call(this, {
                isNewSession: !!this.attributes.rollCallComplete,
                playerCount: this.attributes.playerCount
            });
            this.emit('GlobalResponseReady', responseOptions);
        } else {
            logger.log('DEBUG', 'Resuming roll call, but starting from scratch!');
            this.emit('StartRollCall');
        }                
    },    
     // in roll call mode and they answered they do not want to resume
    'AMAZON.NoIntent' : function(){
        logger.log('DEBUG', 'STATES.ROLLCALL_STATE - AMAZON.NoIntent');        
        this.attributes.resume = false;
        let responseOptions = RollCall.start.call(this);
        this.emit('GlobalResponseReady', responseOptions);
    },
    'SessionEndedRequest': function() {
        logger.log('DEBUG', 'STATES.ROLLCALL_STATE - SessionEndedRequest');        
        this.emit('GlobalSessionEndedRequestHandler');
    },
    'Unhandled': function() {
        logger.log('DEBUG', 'STATES.ROLLCALL_STATE - Unhandled');
        this.emit('GlobalDefaultHandler');
    }
});

module.exports = rollCallHandlers;