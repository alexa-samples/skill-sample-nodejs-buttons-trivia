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
const settings          = require('../config/settings.js');
const logger            = require('../utils/logger.js');
const UI                = require('../dialog/uiprompts.js');
const Game              = require('../game_play/game.js');


/**
 * GAME_LOOP Intent handlers. 
 * 
 * This file contains the intent & event handlers associated with a round
 * of a game of trivia. The game logic is implemented in game.js
 * 
 * The game loop is as follows
 *  1) Determine where in the game we are beginning, somewhere in middle. Add 
 *      any accumulated speech to the response.
 *  2) Find the next question from the ../config/questions.js library
 *  3) Ask the question and return a GameEngine.StartInputHandler directive
 *      https://developer.amazon.com/docs/gadget-skills/receive-echo-button-events.html
 *  4) When a button event comes in, send a voice prompt using the answerQuestion method
 *  5) Process the input, collect the right/wrong verbal response
 *  6) Pass this accumulated speech to the loop and start at the beginning of loop
 */
const gameLoopHandlers = Alexa.CreateStateHandler(settings.STATE.GAME_LOOP_STATE, {
    'LaunchRequest' : function(){
        this.handler.state = settings.STATE.ROLLCALL_STATE;
        this.emit('NewSession');
    },
    'PlayGame' : function(){   
        logger.log('DEBUG', 'STATE' + settings.STATE.GAME_LOOP_STATE + ' - PlayGame');  
        
        let isFirstQuestion = parseInt(this.attributes.currentQuestion || 0, 10) <= 1;
        let {outputSpeech} = this.getUIPrompts({
            key: (isFirstQuestion ? 'PLAY_GAME_FIRST_QUESTION' : 'PLAY_GAME_MID_GAME'),
            params: {
                'current_question': this.attributes.currentQuestion
        }})

        this.attributes.accumulatedSpeech = [ outputSpeech + "<break time='1s'/>" ];        
        this.emitWithState('AskQuestion');
    },
    'DontKnowIntent': function() {
        logger.log('DEBUG', 'STATE' + settings.STATE.GAME_LOOP_STATE + ' - DontKnowIntent');
        this.emitWithState('AMAZON.NextIntent');
    },
    'AMAZON.NextIntent': function() {
        logger.log('DEBUG', 'STATE' + settings.STATE.GAME_LOOP_STATE + ' - AMAZON.NextIntent');
        this.attributes.currentQuestion = parseInt(this.attributes.currentQuestion || 0, 10) + 1;
        delete this.attributes.repeat;
        let isLastQuestion = 
            parseInt(this.attributes.currentQuestion || 1, 10) > settings.GAME.QUESTIONS_PER_GAME;
        let {outputSpeech} = this.getUIPrompts({
            key: (isLastQuestion ? 'PLAY_GAME_SKIP_LAST_QUESTION' : 'PLAY_GAME_SKIP_QUESTION'),            
            params: {
                'current_question': this.attributes.currentQuestion
        }})
        this.attributes.accumulatedSpeech = [ outputSpeech + "<break time='1s'/>"];
        this.emitWithState('AskQuestion');
    },
    'GameEngine.InputHandlerEvent': function() {
        logger.log('DEBUG', 'STATE' + settings.STATE.GAME_LOOP_STATE + ' - GameEngine.InputHandlerEvent');
        Game.handleGameInputEvent.call(this, this.event.request.events);
    },
    'AskQuestion': function() {
        logger.log('DEBUG', 'STATE' + settings.STATE.GAME_LOOP_STATE + ' - AskQuestion');
        let responseOptions = Game.askQuestion.call(this, false);
        delete this.attributes.correct;
        delete this.attributes.answeringButton;
        delete this.attributes.answeringPlayer;
        this.emit('GlobalResponseReady', responseOptions);
    },
    'AnswerQuestionIntent' : function() {
        logger.log('DEBUG', 'STATE' + settings.STATE.GAME_LOOP_STATE + ' - AnswerQuestionIntent');
        let responseOptions = Game.answerQuestion.call(this);
        this.emit('GlobalResponseReady', responseOptions);
    },
    'AnswerOnlyIntent' : function() {
        logger.log('DEBUG', 'STATE' + settings.STATE.GAME_LOOP_STATE + '- AnswerOnlyIntent');
        let responseOptions = Game.answerQuestion.call(this);
        this.emit('GlobalResponseReady', responseOptions);
    },
    'AMAZON.NoIntent': function() {
        logger.log('DEBUG', 'STATE' + settings.STATE.GAME_LOOP_STATE + ' - AMAZON.NoIntent');
        let responseOptions = Game.endGame.call(this, { resetGame: false });
        this.emit('GlobalSessionEndedRequestHandler', responseOptions);
    },
    'AMAZON.YesIntent': function() {
        logger.log('DEBUG', 'STATE' + settings.STATE.GAME_LOOP_STATE + ' - AMAZON.YesIntent');
        this.emitWithState('AskQuestion');
    },
    'AMAZON.StopIntent': function() {
        logger.log('DEBUG', 'STATE' + settings.STATE.GAME_LOOP_STATE + ' - AMAZON.StopIntent');
        let responseOptions = Game.endGame.call(this, { resetGame: false });
        this.emit('GlobalResponseReady', responseOptions);
    },
    'AMAZON.CancelIntent': function() {
        logger.log('DEBUG', 'STATE' + settings.STATE.GAME_LOOP_STATE + ' - AMAZON.CancelIntent');
        let responseOptions = Game.endGame.call(this, { resetGame: false });
        this.emit('GlobalResponseReady', responseOptions);
    },
    'AMAZON.HelpIntent': function() {
        logger.log('DEBUG', 'STATE' + settings.STATE.GAME_LOOP_STATE + ' - AMAZON.HelpIntent');
        
        let responseOptions = Game.handleHelpRequest.call(this);
        this.emit('GlobalResponseReady', responseOptions);
    },
    'SessionEndedRequest': function() {
        logger.log('DEBUG', 'STATE' + settings.STATE.GAME_LOOP_STATE + ' - SessionEndedRequest');
        this.emit('GlobalSessionEndedRequestHandler');
    },
    'Unhandled': function() {
        logger.log('DEBUG', 'STATE' + settings.STATE.GAME_LOOP_STATE + ' - Unhandled');
        this.emit('GlobalDefaultHandler');
    }
});

module.exports = gameLoopHandlers;