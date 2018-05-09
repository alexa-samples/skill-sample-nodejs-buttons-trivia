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
var Alexa                   = require('alexa-sdk');
var stringSimilarity        = require('string-similarity');
var UI                      = require('../dialog/uiprompts.js');
var trivia                  = require('../config/questions.js');
var settings                = require('../config/settings.js');
var directives              = require('../utils/directives.js');
var animations              = require('../button_animations/animations.js');
var logger                  = require('../utils/logger.js');
var scoring                 = require('../utils/scoreutils.js');


const helper = {
    /*
     *  Given an answer string, attempt to remove unnecessary variance, such 
     *  as casing, extra leading or trailing spacing, and convert single digit
     *  numbers to their word forms
     */
    normalizeAnswer: function(answer) {
        let normalizedAnswer = ('' + (answer || '')).toLowerCase();
    
        // remove any leading/trailing spaces
        normalizedAnswer = normalizedAnswer.replace(/^\s+|\s+$/g, '');

        // remove leading articles, such as 'a', 'an', 'the'
        normalizedAnswer = normalizedAnswer.replace(/^(a|an|the)\s+/g, '');

        switch (normalizedAnswer) {
            case '1': normalizedAnswer = 'one';
            case '2': normalizedAnswer = 'two';
            case '3': normalizedAnswer = 'three';
            case '4': normalizedAnswer = 'four';
            case '5': normalizedAnswer = 'five';
            case '6': normalizedAnswer = 'six';
            case '7': normalizedAnswer = 'seven';
            case '8': normalizedAnswer = 'eight';
            case '9': normalizedAnswer = 'nine';
            case '0': normalizedAnswer = 'zero';
        }
        return normalizedAnswer;
    },
    
    getFormattedScoreOutput: function(scoreInfo) {
        let output = scoreInfo.score == 1
                   ? "with a single correct answer, "
                   : scoreInfo.score > 0
                     ? "with " + scoreInfo.score + " correct answers, "
                     : "with no correct answers, ";
    
        if (scoreInfo.players.length == 1) {
            output += "is player " + scoreInfo.players[0];
        } else {
            output += "are players " + scoreInfo.players.slice(0, -1).join(', ');
            output += " and " + scoreInfo.players[scoreInfo.players.length-1];            
        }
        return output;
    },
    
    getFormattedScores: function(scores, numberOfPlayers, isEndOfGame) {
        const orderedScores =
            scoring.getOrderedScoreGroups(scores, numberOfPlayers);
        
        // new representation of scores
        // score = 
        //      { "# correct" : [ 'player #', 'player #', ... ] },
        //      { "# correct" : [ 'player #', 'player #', ... ] },
        // for example
        //      { 5 : [ '1', '2' ] },
        //      { 3 : [ '4' ] },
            
        logger.log('DEBUG', JSON.stringify(orderedScores));    
        
        let outputSpeech = '';
        let uiPrompts = {};
        if (numberOfPlayers > 1) {
            if (orderedScores.length == 0) {
                // handle the special case when there are no scores 
                //   this should technically not happen 
            } else if (orderedScores.length == 1) {
                // handle the special case when all players are tied         
                
                if (orderedScores[0].score == 0) {                
                    uiPrompts = this.getUIPrompts({key: 'SCORING_TIED_NO_ANSWERS'});
                } else {                    
                    if (orderedScores[0].score == 1) {
                        uiPrompts = this.getUIPrompts({key: 'SCORING_TIED_ONE_ANSWER'});                        
                    } else {
                        uiPrompts = this.getUIPrompts({
                            key: 'SCORING_TIED_MULTIPLE_ANSWERS',
                            params: {
                                'answer_count': orderedScores[0].score
                            }
                        });                        
                    }                                   
                }
                outputSpeech = uiPrompts.outputSpeech + ' ';
            } else {        
                for (var placeNbr = 0; placeNbr < orderedScores.length; placeNbr++) {
                    uiPrompts = this.getUIPrompts({
                        key: 'SCORING_MULTI_PLAYERS',
                        params: {
                            'place': (1 + placeNbr), 
                            'score_details': helper.getFormattedScoreOutput.call(this, orderedScores[placeNbr])
                        }
                    });            
                    outputSpeech += uiPrompts.outputSpeech + ". ";
                }                
            }
        } else {
            if (orderedScores[0].score == 0) {
                uiPrompts = this.getUIPrompts({key: 'SCORING_SINGLE_PLAYER_NO_ANSWERS'});                
            } else if (orderedScores[0].score == 1) {             
                uiPrompts = this.getUIPrompts({key: 'SCORING_SINGLE_PLAYER_ONE_ANSWER'});                
            } else {                
                uiPrompts = this.getUIPrompts({
                    key: 'SCORING_SINGLE_PLAYER_MULTIPLE_ANSWERS',
                    params: {
                        'answer_count': orderedScores[0].score
                    }
                });
            }
            outputSpeech = uiPrompts.outputSpeech + '. ';            
        }
        return outputSpeech;
    },

    /*
     * Produces output speech that narrates the current round summary
     */ 
    generateRoundSummaryNarration: function({ currentQuestion, scores, playerCount }) {
        logger.log('DEBUG', 'GenerateRoundSummaryNarration: question = ' + currentQuestion 
            + ', playerCount = ' + playerCount);
        let questionsPerRound = parseInt(settings.GAME.QUESTIONS_PER_ROUND, 10);
        let roundsCompleted = (parseInt(currentQuestion, 10) - 1) / questionsPerRound;
        
        let introPrompt = this.getUIPrompts({
            key: 'GAME_ROUND_SUMMARY_INTRO',
            params: {
                'round': roundsCompleted
        }});
        let outroPrompt = this.getUIPrompts({
            key: 'GAME_ROUND_SUMMARY_OUTRO'
        });
        
        let outputSpeech = "<break time='1s'/>" 
            + introPrompt.outputSpeech + " "        
            + helper.getFormattedScores.call(this, scores, playerCount, false)
            + "<break time='1s'/>"
            + outroPrompt.outputSpeech
            + "<break time='1s'/>";
        return outputSpeech;
    },

    /*
     *  Produces output speech that narrates the game summary
     */
    generateGameSummaryNarration: function({ scores, playerCount }) {
        logger.log('DEBUG', 'STATES.GAME_LOOP_STATE - gameSummary');        
        return helper.getFormattedScores.call(this, scores, playerCount, true);
    },

    shuffleList: function(orderedList) {
        orderedList = orderedList.slice(0);
        for (let i = 0; i < orderedList.length - 1; i++) {
            let j = i + Math.floor(Math.random() * Math.floor(orderedList.length - i));
            let saveIndex = orderedList[i];
            orderedList[i] = orderedList[j];
            orderedList[j] = saveIndex;
        }
        return orderedList;
    }
};

/*
 * This file contains most of the game logic, while the actual intent & event request
 * handler can be found in the gamePlayHandlers.js file. 
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
const Game = {
    /**
     *  Processes a request to end the current game and ends the session.
     *  
     *  Depending the 'resetGame' parameter, the game state may be saved or reset.
     *  When the game is finished, 'resetGame' is always set to TRUE.
     */
    endGame: function({ resetGame }) {    
        logger.log('DEBUG', "GamePlay: end game");
        
        let goodByeUIPrompts = this.getUIPrompts({
            key: resetGame ? 'GAME_FINISHED' : 'GAME_CANCELLED'
        });        

        if (resetGame) {
            /**
             * This means it's the end of the game! Let's reset and let them know the score
             */
            let finalScoresNarrative = helper.generateGameSummaryNarration.call(this, {            
                playerCount: this.attributes.playerCount,
                scores: this.attributes.scores
            });
        
            let outputSpeech = Game.getAccumulatedSpeech.call(this);
            delete this.attributes.accumulatedSpeech;
            
            if (outputSpeech == '') {
                outputSpeech += "<break time='2s'/>";
            }

            let gfIntroPrompt = this.getUIPrompts({key: 'GAME_FINISHED_INTRO'});
            this.response.speak(outputSpeech
                + gfIntroPrompt.outputSpeech + " "
                + finalScoresNarrative
                + "<break time='1s'/>"
                + goodByeUIPrompts.outputSpeech);            
        } else {
            this.response.speak(goodByeUIPrompts.outputSpeech);            
        }

        this.display(goodByeUIPrompts);

        /** play the exit animations on all buttons in play  */
        this.response._addDirective(directives.GadgetController.setIdleAnimation({
            'targetGadgets': this.attributes.buttons.map(b => b.buttonId), 
            'animations': settings.ANIMATIONS.EXIT_ANIMATION
        }));

        return { 'endSession': true, 'resetGame': resetGame };
    },

    /**
     *  Helper function to stop the active input handler if one exists 
     */
    stopCurrentInputHandler: function() {
        // Stop the previous InputHandler
        if (this.attributes.inputHandlerId) {        
            this.response._addDirective(directives.GameEngine.stopInputHandler({ 
                'id': this.attributes.inputHandlerId
            }));            
        }
    },

    /**
     * Called from the GameEngine.InputHandlerEvent handler above.
     * This is when a user presses their Echo Button
     * 
     * This function is invoked when a user presses their button and the skill needs to 
     * prompt them for voice input
     * 
     */
    handleGameInputEvent: function(gameEngineEvents) {    
        logger.log('DEBUG', "GamePlay - handleGameInputEvent: " + JSON.stringify(gameEngineEvents));
        /**
         * For format of the GameEngine.InputHandlerEvent see
         * https://developer.amazon.com/docs/gadget-skills/receive-echo-button-events.html#receive
         */
        switch (gameEngineEvents[0].name) {
            case 'button_down_event': {
                logger.log('DEBUG', 'Game: handle game input event: button_down_event');
                // Find the player from the list of stored buttons
                let player = this.attributes.buttons
                    .find( b => b.buttonId == gameEngineEvents[0].inputEvents[0].gadgetId);
                // Capture that info in the attributes to be used later
                this.attributes.answeringButton = player.buttonId;
                this.attributes.answeringPlayer = player.count;
                
                let { outputSpeech, reprompt } = this.getUIPrompts({
                    key: 'BUZZ_IN_DURING_PLAY',
                    params: {
                        'player_number': player.count
                }});
                
                // Figure out who the other players were so we can shut off their buttons 
                var otherPlayers = this.attributes.buttons
                    .filter( b => b.buttonId != gameEngineEvents[0].inputEvents[0].gadgetId)
                    .map(b => b.buttonId);
                
                // Send directive to clear animations & restore defaults on the other players buttons
                Game.resetAnimations.call(this, otherPlayers);
                // Build the response
                this.response.speak(settings.AUDIO.BUZZ_IN_AUDIO + " " + outputSpeech).listen(reprompt);
                // Send the response
                this.emit('GlobalResponseReady', { 'openMicrophone': true });
                return;
            }
            case 'time_out_event': {
                logger.log('DEBUG', 'Game: handle game input event: time out waiting for button answer');
                delete this.attributes.correct;
                delete this.attributes.answeringButton;
                delete this.attributes.answeringPlayer;
                
                let { outputSpeech, reprompt } = this.getUIPrompts({
                    key: 'ANSWER_TIME_OUT_DURING_PLAY'
                });
                this.response.speak(outputSpeech).listen(reprompt);
                this.emit('GlobalResponseReady', { 'openMicrophone': true });
                return;
            }
            case 'answer_interstitial_event': {         
                let currentQuestion = parseInt(this.attributes.currentQuestion || 1, 10);
                let shuffledQuestionIndex = this.attributes.orderedQuestions[currentQuestion - 1];
                let triviaQuestion = trivia.questions.find( q => q.index == shuffledQuestionIndex);
                
                let { displayTitle } = this.getUIPrompts({
                    key: 'ASK_QUESTION_DISPLAY',
                    params: {
                        'question_number': currentQuestion
                    }
                });
                this.display({
                    displayText: triviaQuestion.question, 
                    displayTitle: displayTitle
                });

                let responseOptions = Game.listenForAnswer.call(this);
                this.emit('GlobalResponseReady', responseOptions);
                return;
            }
            default:
            logger.log('ERROR', "UNHANDLED EVENT " + gameEngineEvents[0].name);          
            this.emit('GlobalDefaultHandler');
        }
    },

    /**
     * Sends directives that reset buttons animations for specified buttons
     */
    resetAnimations: function(buttons) {
        this.response._addDirective(directives.GadgetController.setIdleAnimation({
            'targetGadgets': buttons, 
            'animations': animations.BasicAnimations.SolidAnimation(1, "black", 100)
        }));
        this.response._addDirective(directives.GadgetController.setButtonDownAnimation({
            'targetGadgets': buttons, 
            'animations': animations.BasicAnimations.SolidAnimation(1, "black", 100)
        }));
    },    

    /**
     * Function for receiving voice input to answer a question
     */
    answerQuestion: function() {
        logger.log('DEBUG', 'GamePlay: answerQuestion');
        // Sets up a place for us to gather speech input
        Game.initializeAccumulatedSpeech.call(this);
        
        if (!this.attributes.waitingForAnswer) {
            delete this.attributes.correct;
            let promptToContinue = 
                parseInt(this.attributes.currentQuestion || 0, 10) <= settings.GAME.QUESTIONS_PER_GAME;
            if (promptToContinue) {
                Game.stopCurrentInputHandler.call(this);
                let uiPrompts = this.getUIPrompts({
                    key: 'ANSWER_BEFORE_QUESTION',
                });
                this.response.speak(uiPrompts.outputSpeech).listen(uiPrompts.reprompt);
                return { 'openMicrophone': promptToContinue, 'endSession': false };
            } else {                
                return Game.endGame.call(this, { resetGame: true });
            }            
        } else if (!this.attributes.answeringButton || !this.attributes.answeringPlayer) {
            delete this.attributes.correct;                
            let {outputSpeech, reprompt} = this.getUIPrompts({key: 'ANSWER_WITHOUT_BUTTONS' });
            this.response.speak(outputSpeech);
            return { 'openMicrophone': false, 'endSession': false };
        }

        this.attributes.waitingForAnswer = false;

        // get the answer out of the request event
        let answer = helper.normalizeAnswer(this.event.request.intent.slots.answers.value);
        
        if (answer == '') {
            delete this.attributes.correct;                
            let {outputSpeech, reprompt} = this.getUIPrompts({key: 'MISUNDERSTOOD_ANSWER' });
            this.response.speak(outputSpeech).listen(reprompt);
            return { 'openMicrophone': true, 'endSession': false }
        }
        
        // get the current question from the question bank so we can compare answers
        let currentQuestionIndex = parseInt(this.attributes.currentQuestion || 1, 10);
        let shuffledQuestionIndex = this.attributes.orderedQuestions[currentQuestionIndex-1];
        let currentQuestion = trivia.questions.find( q => q.index == shuffledQuestionIndex);
        // get the answers
        let answers = currentQuestion.answers.map(a => helper.normalizeAnswer(a));
        // get the correct answer
        let correct_answer = helper.normalizeAnswer(currentQuestion.correct_answer);
        // use a string similarity match to determine if the spoken answer is close to one of the supplied values
        var matches = stringSimilarity.findBestMatch(answer, answers);
        
        logger.log('DEBUG', "COMPARING '" + answer + "' to [" + answers + "]: (" + matches.ratings.length + " matches)");
        // flag to determine if we have a match
        var answered = false;
        // loop through all the matches, in case there is more than one that is good enough to consider
        for (var i=0; i<matches.ratings.length; ++i) {
            var match = matches.ratings[i];
            if (match.rating > settings.GAME.ANSWER_SIMILARITY){
                // Answer is the correct answer
                if (match.target == correct_answer){
                    // move onto the next question
                    this.attributes.currentQuestion += 1;
                    // check to see if we are keeping score yet
                    if (!('scores' in this.attributes)){
                        this.attributes.scores = {};
                        this.attributes.scores[this.attributes.answeringPlayer] = 1;
                    // if this player already has a score, increment it
                    } else if (this.attributes.answeringPlayer in this.attributes.scores){
                        this.attributes.scores[this.attributes.answeringPlayer] += 1;
                    // otherwise just start a new score
                    } else {
                        this.attributes.scores[this.attributes.answeringPlayer] = 1;
                    }
                    
                    let uiPrompts = this.getUIPrompts({
                        key: 'CORRECT_ANSWER_DURING_PLAY',
                        params: {
                            'player_number': this.attributes.answeringPlayer
                    }});
                    
                    // To change the correct answer sound, replace AUDIO.CORRECT_ANSWER_AUDIO 
                    // with your audio clip by updating config/settings.js
                    let outputSpeech = settings.AUDIO.CORRECT_ANSWER_AUDIO + " " + uiPrompts.outputSpeech;
                    // store this line in the accumulated speech
                    this.attributes.accumulatedSpeech.push(outputSpeech);
                    // mark that the user answered this correct
                    this.attributes.correct = true;

                    // if we are asking this question for the Nth time, where N > 1, delete that flag                
                    delete this.attributes.repeat;
                    
                    logger.log('DEBUG', "Answer provided matched one of the expected answers!");
                    answered = true;
                    break;
                }
            }
        }
        // If we looped through the answer without a match
        if (answered === false)
        {
            if (!this.attributes.repeat || this.attributes.repeat < settings.GAME.MAX_ANSWERS_PER_QUESTION) {
                logger.log('DEBUG', "Answer provided doesn't seem to match any of the expected answers -> repeat question");
                // Flag this question for repeat
                let repeatCount = this.attributes.repeat || 0;
                this.attributes.repeat = parseInt(repeatCount, 10) + 1;
                                
                let uiPrompts = this.getUIPrompts({
                    key: 'INCORRECT_ANSWER_DURING_PLAY', 
                    params: {
                        'player_number': this.attributes.answeringPlayer
                }});
                
                let outputSpeech = settings.AUDIO.INCORRECT_ANSWER_AUDIO + " " + uiPrompts.outputSpeech;
                // store the line
                this.attributes.accumulatedSpeech.push(outputSpeech);
                // mark answer as incorrect
                this.attributes.correct = false;
            } else {
                this.attributes.currentQuestion += 1;
                logger.log('DEBUG', "Answer provided doesn't seem to match any of the expected answers -> skip question");
                delete this.attributes.repeat;        
                
                // Build the response        
                let uiPrompts = this.getUIPrompts({
                    key: 'INCORRECT_ANSWER_TOO_MANY_TIMES',                    
                    params: {
                        'player_number': this.attributes.answeringPlayer
                }});
                
                let outputSpeech = settings.AUDIO.INCORRECT_ANSWER_AUDIO + " " + uiPrompts.outputSpeech;
                // store the line
                this.attributes.accumulatedSpeech.push(outputSpeech);
                // mark answer as incorrect
                this.attributes.correct = false;
            }
        }
        // Move on to asking the same/next question depending on the state
        return Game.askQuestion.call(this, true);
    },

    /**
     * Setup a storage place for gathering response lines
     */
    initializeAccumulatedSpeech: function() {
        if ( !('accumulatedSpeech' in this.attributes )){
            this.attributes.accumulatedSpeech = []
        }
    },

    /**
     * Setup a storage place for gathering response lines
     */
    getAccumulatedSpeech: function() {
        if ( 'accumulatedSpeech' in this.attributes ){
            let outputSpeech = '';
            if (this.attributes.accumulatedSpeech.length > 0){
                this.attributes.accumulatedSpeech.forEach( function(line){
                    outputSpeech += ' ' + line + ' ';
                });
            }
            return outputSpeech;
        }
        return '';
    },
    /**
     * Function: askQuestion
     * 
     * Function to gather the built responses, add them to the overall response and handle the 
     * logic of retrieving and asking the next/same question depending on if the user got it right.
     */
    askQuestion : function(isFollowingAnswer) {
        logger.log('DEBUG', 'GamePlay: askQuestion (currentQuestion = ' + this.attributes.currentQuestion + ')');                

        let currentQuestion;
        if ( 'currentQuestion' in this.attributes ) {
            currentQuestion = parseInt(this.attributes.currentQuestion, 10);            
        } else {
            currentQuestion = 1;
            this.attributes.currentQuestion = 1;
        }
                
        if (!this.attributes.orderedQuestions || 
            (currentQuestion === 1 && !('repeat' in this.attributes))) {
            if (settings.GAME.SUFFLE_QUESTIONS) {
                logger.log('DEBUG', 'GamePlay: producing ordered question list for new game (using shuffling)!');
                // if this is the first question, then shuffle the questions
                let orderedQuestions = helper.shuffleList(trivia.questions.map(q => q.index))
                        .slice(0, settings.GAME.QUESTIONS_PER_GAME);
                // and store the ordered list of questions in the attributes           
                this.attributes.orderedQuestions = orderedQuestions;    
            } else {
                logger.log('DEBUG', 'GamePlay: producing ordered question list for new game (shuffling disabled)!');
                this.attributes.orderedQuestions = trivia.questions.map(q => q.index)
                        .slice(0, settings.GAME.QUESTIONS_PER_GAME);
            }        
        }

        let shuffledQuestionIndex = this.attributes.orderedQuestions[currentQuestion - 1];
        let nextQuestion = trivia.questions.find( q => q.index == shuffledQuestionIndex);
        logger.log('DEBUG', 'Ask question: ' + currentQuestion + ' of ' + settings.GAME.QUESTIONS_PER_GAME 
            + ', next question: ' + JSON.stringify(nextQuestion, null, 2));
        if (!nextQuestion || currentQuestion > settings.GAME.QUESTIONS_PER_GAME) {
            /* call the 'endGame' helper to process the end of game logic */
            return Game.endGame.call(this, { resetGame: true });
        } else {
            let outputSpeech = Game.getAccumulatedSpeech.call(this);
            delete this.attributes.accumulatedSpeech;

            let interstitialDelay = isFollowingAnswer ? 6000 : 3000;
            
            let questionsPerRound = parseInt(settings.GAME.QUESTIONS_PER_ROUND, 10);

            // check to see if it's time to generate and recite a game round summary 
            //  if it is time, append the round summary to the outputSpeech
            //  before we go further and generate the question outputSpeech            
            if( currentQuestion > 2 
                && !this.attributes.repeat 
                && currentQuestion < settings.GAME.QUESTIONS_PER_GAME 
                && ((currentQuestion - 1) % questionsPerRound) === 0) {
                    interstitialDelay += 12000;
                    outputSpeech += helper.generateRoundSummaryNarration.call(this, {
                        currentQuestion: this.attributes.currentQuestion,
                        playerCount: this.attributes.playerCount,
                        scores: this.attributes.scores
                    });                
            }

            if ('correct' in this.attributes) {
                // player answered the question - either correctly, or incorrectly 
                let uiKey = 'ANSWER_QUESTION_INCORRECT_DISPLAY';
                let uiImage = settings.pickRandom(settings.IMAGES.INCORRECT_ANSWER_IMAGES);
                if (this.attributes.correct) {                    
                    uiKey = 'ANSWER_QUESTION_CORRECT_DISPLAY';
                    uiImage = settings.pickRandom(settings.IMAGES.CORRECT_ANSWER_IMAGES);                    
                }
                let uiPrompts = this.getUIPrompts({
                    key: uiKey,
                    params: {
                        'player_number': this.attributes.answeringPlayer
                    }
                });
                this.display({
                    displayTitle: uiPrompts.displayTitle, 
                    displayText: uiPrompts.displayText,
                    image: uiImage
                });
            } else {   
                // if 'correct' is missing from attributes, this is the first question asked           
                let uiPrompts = this.getUIPrompts({
                    key: (currentQuestion === 1 
                        ? 'ASK_FIRST_QUESTION_NEW_GAME_DISPLAY'
                        : 'ASK_FIRST_QUESTION_RESUME_DISPLAY')
                });
                this.display(uiPrompts);                
            }

            let questionSpeech = nextQuestion.question;
            if (nextQuestion.answers) {
                let answers         = "<break time='4s'/> Is it ";
                if (nextQuestion.answers.length > 1) {
                    answers += nextQuestion.answers.slice(0, -1).join(', ') + ", or, " +
                               nextQuestion.answers[nextQuestion.answers.length - 1];
                } else {
                    answers  = nextQuestion.answers[0];
                }                
                questionSpeech += ' ' + answers + "? ";
            }
            
            // add waiting sound
            outputSpeech += questionSpeech + ' ' + settings.AUDIO.WAITING_FOR_BUZZ_IN_AUDIO;

            this.response.speak(outputSpeech);
            
            logger.log('DEBUG', "== QUESTION == " + nextQuestion.index);
                        
            Game.animateButtonsAfterAnswer.call(this);
            
            delete this.attributes.answeringButton;
            delete this.attributes.answeringPlayer;

            return Game.sendAnswerInterstitial.call(this, interstitialDelay);
        }
    },

    /*
     * Starts an input handler and starts listening for button presses, to answer the question
     */
    listenForAnswer: function(isFollowingAnswer) {
        logger.log('DEBUG', 'GamePlay: listen for answer');        
        this.attributes.inputHandlerId = this.event.request.requestId;
        // create a list of proxies of the same length as the number of buttons we're trying to match
        let gadgetIds = this.attributes.buttons.map((b,i) => b.buttonId);
        this.response._addDirective(directives.GameEngine.startInputHandler({ 
            'timeout': 25000,         
            'recognizers': {
                'any_button_buzz_in': {
                    "type": "match",
                    "fuzzy": false,
                    "anchor": "start",
                    "gadgetIds": gadgetIds,                                   
                    "pattern": [{                                        
                        "action": "down"
                    }]
                }
            },
            'events': {
                'button_down_event': {
                    'meets': ['any_button_buzz_in'],
                    'reports': 'matches',
                    'shouldEndInputHandler': true,
                    'maximumInvocations': 1
                },
                'time_out_event': {
                    'meets': ['timed out'],
                    'reports': 'history',
                    'shouldEndInputHandler': true
                }
            }
        }));

        // Send Button Down Event
        this.response._addDirective(directives.GadgetController.setButtonDownAnimation({
            'targetGadgets': gadgetIds,
            'animations': settings.ANIMATIONS.BUZZ_IN_ANIMATION
        }));

        // everyone gets the same animations
        this.response._addDirective(directives.GadgetController.setIdleAnimation({
            'targetGadgets': gadgetIds,
            'animations': settings.ANIMATIONS.LISTEN_FOR_ANSWER_ANIMATION
        }));

        this.attributes.waitingForAnswer = true;
        delete this.attributes.gameStarting;
        return { 'openMicrophone': false, 'endSession': false };
    },

    /*
     * Starts an input handler and starts listening for button presses, to answer the question
     */
    sendAnswerInterstitial: function(interstitialDelay) {
        logger.log('DEBUG', 'GamePlay: answer interstitial');        
        this.attributes.inputHandlerId = this.event.request.requestId;
        
        this.response._addDirective(directives.GameEngine.startInputHandler({ 
            'timeout': interstitialDelay,
            'recognizers': { },                     
            'events': {
                'answer_interstitial_event': {
                    'meets': ['timed out'],
                    'reports': 'history',
                    'shouldEndInputHandler': true
                }
            }
        }));

        return { 'openMicrophone': false, 'endSession': false };
    },

    /*
     * Starts an input handler and starts listening for button presses, to answer the question
     */
    animateButtonsAfterAnswer: function(isFollowingAnswer) {
        logger.log('DEBUG', 'GamePlay: animate buttons after answer');
        
        // Send light animations for buttons, depenending on status     
        let allPlayers = this.attributes.buttons.map(b => b.buttonId);
        if ('correct' in this.attributes) {
            let animation = [];
            if (this.attributes.correct) {                
                animation = settings.ANIMATIONS.CORRECT_ANSWER_ANIMATION;
            } else {
                animation = settings.ANIMATIONS.INCORRECT_ANSWER_ANIMATION;
            }
            // get other players who didn't answer
            var otherPlayers = this.attributes.buttons
                .filter( b => b.buttonId != this.attributes.answeringButton)
                .map(b => b.buttonId);

            if (this.attributes.answeringButton) {                
                this.response._addDirective(directives.GadgetController.setIdleAnimation({
                    'targetGadgets': [ this.attributes.answeringButton ],
                    'animations': animation
                }));
            }
            if (otherPlayers && otherPlayers.length > 0) {                
                this.response._addDirective(directives.GadgetController.setIdleAnimation({
                    'targetGadgets': otherPlayers,
                    'animations': settings.ANIMATIONS.BUZZ_IN_OTHER_PLAYERS_ANIMATION                    
                }));
            }
        } else {
            // everyone gets the same animations            
            this.response._addDirective(directives.GadgetController.setIdleAnimation({
                'targetGadgets': allPlayers,
                'animations': settings.ANIMATIONS.BUZZ_IN_OTHER_PLAYERS_ANIMATION
            }));
        }
        
        // Send Button Down Event
        this.response._addDirective(directives.GadgetController.setButtonDownAnimation({
            'targetGadgets': allPlayers,
            'animations': animations.BasicAnimations.SolidAnimation(1, 'black', 100)
        }));

        return { 'openMicrophone': false, 'endSession': false };
    },

    handleHelpRequest: function() {
        
        Game.stopCurrentInputHandler.call(this);

        let uiPrompts = this.getUIPrompts({
            key: 'GAME_PLAY_HELP'
        });

        delete this.attributes.answeringButton;
        delete this.attributes.answeringPlayer;
        delete this.attributes.correct;

        this.response.speak(uiPrompts.outputSpeech).listen(uiPrompts.reprompt);
        this.display(uiPrompts);
        return { 'openMicrophone': true, 'endSession': false };
    }
};
module.exports = Game;