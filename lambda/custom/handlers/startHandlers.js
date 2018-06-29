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
const makePlainText     = Alexa.utils.TextUtils.makePlainText;
const makeImage         = Alexa.utils.ImageUtils.makeImage;
/**
 * DEFAULT_STATE
 */
const startHandlers = Alexa.CreateStateHandler(settings.STATE.DEFAULT_STATE, {
    'LaunchRequest': function() {
        logger.log('DEBUG', 'DEFAULT_STATE - LaunchRequest');
        this.emit('NewSession');
    },

    /**
     * Invoked when a user says 'play a game' or other variant
     */
    'PlayGame': function(promptKey) {        
        /**
         * If they have a game in progress, ask to see if they want to resume the game
         */    
        let playerCount = this.attributes.playerCount;
        let rollCallComplete = 'rollCallComplete' in this.attributes && playerCount;
        let gameInProgress = (this.attributes.currentQuestion || 0) <= settings.GAME.QUESTIONS_PER_GAME;
        logger.log('DEBUG', 'DEFAULT_STATE - PlayGame (playerCount = ' + playerCount 
            + ', rollCallComplete = ' + rollCallComplete 
            + ', currentQuestion = ' + this.attributes.currentQuestion + ')');

        if (rollCallComplete && gameInProgress) {
            promptKey = promptKey || 'ASK_TO_RESUME';
            let uiPrompts = this.getUIPrompts({
                key: promptKey,
                params: {
                    'player_count': playerCount
            }});
            this.display(uiPrompts);
            this.response.speak(uiPrompts.outputSpeech).listen(uiPrompts.reprompt);

            // ask to resume, and go to RollCall state
            this.attributes.STATE = settings.STATE.ROLLCALL_STATE;
            this.emit('GlobalResponseReady', { 'openMicrophone': true });
        } else {
            this.emit('StartRollCall');
        }
    },

    'StartNewGameIntent' : function() {
        logger.log('DEBUG', 'DEFAULT_STATE - StartNewGameIntent');
        
        this.attributes.resume = false;
        delete this.attributes.correct;
        delete this.attributes.answeringButton;
        delete this.attributes.answeringPlayer;
        delete this.attributes.waitingForAnswer;
        this.attributes.currentQuestion = 0;
        this.emit('StartRollCall');
    },

    /**
     * Invoked when a user asks for help from a new session
     * like "Alexa ask <invocation name> for help"
     */
    'NewSession': function() {
        logger.log('DEBUG', 'DEFAULT_STATE - NewSession Handler');
        if (this.event.request.intent && 
            this.event.request.intent.name && 
            this.event.request.intent.name === 'AMAZON.HelpIntent' ){

            this.emit('AMAZON.HelpIntent');
            return;
        }
        
        /*
         * delete attributes that may have carried over from a previous session
         */
        delete this.attributes.expectingEndSkillConfirmation;
        delete this.attributes.resume;        
        delete this.attributes.inputHandlerId;
        delete this.attributes.correct;
        delete this.attributes.answeringButton;
        delete this.attributes.answeringPlayer;
        delete this.attributes.waitingForAnswer;
        this.attributes.gameStarting = true;

        /**
         * If they are starting a new session but have a game in progress,
         * ask to see if they want to resume the game
         */
        this.emit('PlayGame', 'ASK_TO_RESUME_NEW_SESSION');        
    },

    'AMAZON.HelpIntent': function() {        
        logger.log('DEBUG', "DEFAULT_STATE - AMAZON.HelpIntent");

        let {outputSpeech, reprompt} = this.getUIPrompts({
            key: 'GENERAL_HELP'
        });
        this.response.speak(outputSpeech).listen(reprompt);        
        this.emit('GlobalResponseReady', { 'openMicrophone': true });
    },

    'DontKnowIntent': function() {
        logger.log('DEBUG', "STATES.START_MODE - DontKnowIntent");         
        this.emitWithState('AMAZON.HelpIntent');
    },

    /**
     * Result of the prompt to see if they want to 
     * resume their previous game. Reset the game state and
     * pass a variable to roll call (i.e. this.attributes.resume)
     * so we can affect the TTS to be more natural and sound different 
     * from the regular game start
     */
    'AMAZON.NoIntent' : function() {
        logger.log('DEBUG', 'DEFAULT_STATE - AMAZON.NoIntent');
        
        this.attributes.resume = false;
        this.emit('StartRollCall');
    },

    'AMAZON.StopIntent': function() {
        logger.log('DEBUG', "DEFAULT_STATE - AMAZON.StopIntent");
        let {outputSpeech, reprompt} = this.getUIPrompts({
            key: 'GOOD_BYE'
        });
        this.response.speak(outputSpeech);        
        this.emit('GlobalSessionEndedRequestHandler');
    },

    'AMAZON.CancelIntent': function() {
        logger.log('DEBUG', "DEFAULT_STATE - AMAZON.CancelIntent");              
        this.emit('AMAZON.StopIntent');
    },

    'StartRollCall' : function() {
        logger.log('DEBUG', 'DEFAULT_STATE - Calling RollCall.start');
        let responseParams = RollCall.start.call(this);
        this.emit('GlobalResponseReady', responseParams);
    },

    'Unhandled': function() {
        logger.log('DEBUG', "DEFAULT_STATE - UnhandledIntent");
        this.emit('GlobalDefaultHandler');        
    },

    'SessionEndedRequest': function() {
        logger.log('DEBUG', 'DEFAULT_STATE - SessionEndedRequest');
        this.emit('GlobalSessionEndedRequestHandler');
    }    
});
module.exports = startHandlers;
