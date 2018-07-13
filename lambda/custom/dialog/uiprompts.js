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
const logger   = require('../utils/logger.js');
const sprintf  = require('sprintf-js').sprintf;

const DEFAULT_LANGUAGE = 'en';
const GAME_TITLE = 'Buttons Trivia';

const UI = Object.freeze({    
    'en': { 
      'us': {
        'GENERAL_HELP': {
            outputSpeech: ['This is an example game for the new Echo Buttons. ' +                      
                           'It shows examples of how to perform roll call, ' + 
                           'ensuring players are registered for the game, ' +
                           'and how to provide a scoreboard, and game summary. ' +
                           'To get started just ask me to play a game. ' +
                           'What would you like to do?'],
            reprompt: ["Sorry, I didn't catch that, what would you like to do next?"],
            displayTitle: [GAME_TITLE + ' - Help'],
            displayText: ['This is an example game for the new Echo Buttons. ' +
                          'To get started just ask me to play a game.']
        },    
        'UNHANDLED_REQUEST': {
            outputSpeech: ["Sorry, I didn't get that. Please say again!"],
            reprompt: ["Please say it again. You can ask for help if you're not sure what to do."]
        },
        'RESUME_GAME': {
            outputSpeech: ['Ok, we will pick up where you left off. ' +
                           'How many players will be playing?'],
            reprompt: ['How many players?'],
            displayTitle: [GAME_TITLE + " - Welcome"],
            displayText: ["Welcome back!"]
        },
        'DONT_RESUME_GAME': {
            outputSpeech: ['Ok, lets start a new game. How many players will be playing?'],
            reprompt: ['How many players?'],
            displayTitle: [GAME_TITLE + " - Welcome"],
            displayText: ["Ok. Let's start a new game!"]
        },
        'GOOD_BYE': {
            outputSpeech: ["Ok, see you next time!"],
            reprompt: ['']
        },
        'ASK_TO_RESUME': {
            outputSpeech: ["It looks like you have a %(player_count)s player game in progress, " +
                           "would you like to resume?" ],
            reprompt: ['Would you like to resume the last game?'],
            displayTitle: [GAME_TITLE + " - Welcome"],
            displayText: ["You have a %(player_count)s player game in progress."]
        },
        'ASK_TO_RESUME_NEW_SESSION': {
            outputSpeech: ["Welcome back! " + 
                           "It looks like you have a %(player_count)s player game in progress, " +
                           "would you like to resume?"],
            reprompt: ['Would you like to resume the last game?'],
            displayTitle: [GAME_TITLE + " - Welcome"],
            displayText: ["You have a %(player_count)s player game in progress."]
        },
        //--------------------  Roll Call Related Prompts -------------------------------------------
        'START_ROLL_CALL': {      
            outputSpeech: ["Welcome to " + GAME_TITLE + ". This game supports up to " +
                           settings.GAME.MAX_PLAYERS + " players. " + 
                           "How many players are there?"],
            reprompt: ["How many players?"],
            displayTitle: [GAME_TITLE + " - Welcome"],
            displayText: ["Welcome to " + GAME_TITLE + ". This game supports up to " 
                      + settings.GAME.MAX_PLAYERS + " players."]
        },
        'ROLL_CALL_HELP': {
            outputSpeech: ['This is an example game for the new Echo Buttons. ' +  
                           'In order to play the game, each player must check in by ' +
                           'pressing an Echo Button. Would you like to continue and ' +
                           'check players in for the game?'], 
            reprompt: ["Sorry, I didn't catch that, what would you like to do next?"],
            displayTitle: [GAME_TITLE + ' - Help'],
            displayText: ['In order to play the game, each player must check in by ' +
                          'pressing an Echo Button. Would you like to continue?']
        },
        'ROLL_CALL_EXIT_HELP': {
            outputSpeech: ['This is an example game for the new Echo Buttons. ' +  
                        'In order to play the game, each player must check in by ' +
                        'pressing an Echo Button. Would you like to continue and ' +
                        'check players in for the game?'], 
            reprompt: ["Sorry, I didn't catch that, what would you like to do next?"],
            displayTitle: [GAME_TITLE + ' - Help'],
            displayText: ['In order to play the game, each player must check in by ' +
                          'pressing an Echo Button. Would you like to continue?']
        },
        'PLAYERCOUNT_INVALID': {
            outputSpeech: ['Please say a number between one and ' + settings.GAME.MAX_PLAYERS],
            reprompt: ['Please say a number between one and ' + settings.GAME.MAX_PLAYERS]
        },
        'ROLL_CALL_CONTINUE': {
            outputSpeech: ["Ok. Players, press your buttons now, " +
                           "so I'll know which buttons you will be using."],
            displayTitle: [GAME_TITLE + " - Welcome"],
            displayText: ["To resume the game, each player, please press your button once!"]
        },        
        'ROLL_CALL_TIME_OUT': {
            outputSpeech: ["<say-as interpret-as='interjection'>uh oh</say-as>, " +
                           "looks like times up and I haven't heard from all players. " +
                           "Did you want to continue?"],
            reprompt: ["should we continue?"]
        },
        'ROLL_CALL_RESUME_GAME': {
            outputSpeech: ["To resume the game, each player, please press your button once!"],
            displayTitle: [GAME_TITLE + " - Welcome"],
            displayText: ["To resume the game, each player, please press your button once!"]
        },
        'ROLL_CALL_COMPLETE': {
            outputSpeech: ["Great! We can start the game. Players, are you ready?",
                           "Awesome. All players registered. Are you ready to start the game?"],
            reprompt: ["Ready to start the game?"],
            displayTitle: [GAME_TITLE + " - Welcome"],
            displayText: ["Are you ready to start the game?"]
        },
        'ROLL_CALL_HELLO_PLAYER': {
            outputSpeech: ["Hello, player %(player_number)s. "]
        },
        'ROLL_CALL_PLAYER_ALREADY_CHECKED_IN': {
            outputSpeech: ["Hey player %(player_number)s. " + 
                           "You already checked in. You can't register twice."]
        },
        'ROLL_CALL_NEXT_PLAYER_PROMPT': {
            outputSpeech: ["Ok, your turn Player %(player_number)s, press your button."]
        }, 
        'ANSWER_DURING_ROLLCALL': {
            outputSpeech: ["The game hasn't started yet. " + 
                           "All players, please press your buttons to get started!"]
        },   
        //--------------------  Game Play Related Prompts -------------------------------------------
    
        'GAME_CANCELLED': {
            outputSpeech: ["Ok, see you next time! " + 
                           "We'll save this game for later if you'd like to resume"],
            reprompt: [''],
            displayText: ["See you next time!"],
            displayTitle: ["Thanks for playing!"]
        },
        'GAME_FINISHED_INTRO': {
            outputSpeech: ["The game is finished. let's hear the final scores."]
        },
        'GAME_FINISHED': {
            outputSpeech: ["Thanks for playing"],
            reprompt: [''],
            displayText: ["See you next time!"],
            displayTitle: ["Thanks for playing!"]
        },
        'PLAY_GAME_FIRST_QUESTION': {
            outputSpeech: ["Ok! Let's start the game!"]
        },
        'PLAY_GAME_SKIP_QUESTION': {
            outputSpeech: ["Alright. Let's try another question."]
        },
        'PLAY_GAME_SKIP_LAST_QUESTION': {
            outputSpeech: ["Alright. That was the last question."]
        },
        'PLAY_GAME_MID_GAME': {
            outputSpeech: ["Ok! Let's keep going. " + 
                           "We are on question %(current_question)s!"]
        },                
        'ANSWER_TIME_OUT_DURING_PLAY': {
            outputSpeech: ["I didn't hear any presses. Would you like to keep playing?"],
            reprompt: ["Would you like to keep playing?"]
        },
        
        'BUZZ_IN_DURING_PLAY': {
            outputSpeech: ["Ok, player %(player_number)s, what's the answer?"],
            reprompt: ["Player %(player_number)s, are you there?"]
        },
        'CORRECT_ANSWER_DURING_PLAY': {
            outputSpeech: ["Correct! Great job player %(player_number)s."]       
        },
        'INCORRECT_ANSWER_DURING_PLAY': {
            outputSpeech: ["Sorry, wrong answer player %(player_number)s."]
        },
        'INCORRECT_ANSWER_TOO_MANY_TIMES': {
            outputSpeech: ["Sorry, wrong answer player %(player_number)s. "
                          + "Let's try another question."]
        },
        'MISUNDERSTOOD_ANSWER': {
            outputSpeech: ["Sorry, I didn't get that. Please say again!"],
            reprompt: ["Please repeat the answer."]
        },
        'ANSWER_WITHOUT_BUTTONS': {
            outputSpeech: ["<say-as interpret-as='interjection'>now now</say-as>" +
                           "<break time='1s'/>Press your button to answer the question!"]
        },
        'ANSWER_BEFORE_QUESTION': {
            outputSpeech: ["I haven't asked the question yet! Wait for me to ask, then " +
                           "press your button if you know the answer! Are you ready?"],
            reprompt: ["Are you ready to play?"]
        },
        'ASK_QUESTION_DISPLAY': {
            displayTitle: [GAME_TITLE + " - Question %(question_number)s"]
        },
        'ANSWER_QUESTION_CORRECT_DISPLAY': {
            displayTitle: [GAME_TITLE + " - Player %(player_number)s"],
            displayText: ["Great job! That's right.", 
                          "Awesome! That's the answer.", 
                          "Correct! You got it."]
        },
        'ANSWER_QUESTION_INCORRECT_DISPLAY': {
            displayTitle: [GAME_TITLE + " - Player %(player_number)s"],
            displayText: ["Opps! That's not right.", 
                          "Oh no! That's not the answer.", 
                          "No, that's not it!"]
        },
        'ASK_FIRST_QUESTION_NEW_GAME_DISPLAY': {
            displayTitle: [GAME_TITLE + " - New Game"],
            displayText: ["Get ready to start!"]
        },
        'ASK_FIRST_QUESTION_RESUME_DISPLAY': {
            displayTitle: [GAME_TITLE + " - Resume Game"],
            displayText: ["Get ready to start!"]
        },
        'GAME_PLAY_HELP': {
            outputSpeech: ['This is an example trivia game. ' +                      
                           'During the game, I will ask one question at a time. ' + 
                           'If you know the answer, press your button for a chance ' +
                           'to answer. You will earn a point for each question you ' +
                           'answer correctly. Would you like to continue to play? '],
            reprompt: ["Sorry, I didn't catch that, what would you like to do next?"],
            displayTitle: [GAME_TITLE + " - Help"],
            displayText: ['During the game, I will ask one question at a time. ' + 
                           'If you know the answer, press your button for a chance ' +
                           'to answer. You will earn a point for each question you ' +
                           'answer correctly.']
        },
        'GAME_ROUND_SUMMARY_INTRO': {
            outputSpeech: ["After the <say-as interpret-as='ordinal'>%(round)s</say-as> round."]
        },
        'GAME_ROUND_SUMMARY_OUTRO': {
            outputSpeech: ["Let's continue!"]
        },
        //--------------------  Scoring Related Prompts -------------------------------------------
        'SCORING_TIED_NO_ANSWERS': {
            outputSpeech: ["It's a tie! With no correct answers. Can you do better?"]
        },
        'SCORING_TIED_ONE_ANSWER': {
            outputSpeech: ["It's a tie! With a single correct answer. What a game!"]
        },
        'SCORING_TIED_MULTIPLE_ANSWERS': {
            outputSpeech: ["It's a tie! With %(answer_count)s correct answers. What a game!"]
        },

        'SCORING_SINGLE_PLAYER_NO_ANSWERS': {
            outputSpeech: ["You haven't answered any questions correctly"]
        },
        'SCORING_SINGLE_PLAYER_ONE_ANSWER': {
            outputSpeech: ["You answered a single question correctly"]
        },
        'SCORING_SINGLE_PLAYER_MULTIPLE_ANSWERS': {
            outputSpeech: ["You have %(answer_count)s correct answers"]
        },

        'SCORING_MULTI_PLAYERS': {
            outputSpeech: ["In <say-as interpret-as='ordinal'>%(place)s</say-as> place, " +
                           " %(score_details)s"]
        }        
      }  
    }
});

function parseLocale({locale}) {
    
    let localeParts = (locale || DEFAULT_LANGUAGE).split('-');
    let normalizedLocaleParts = localeParts.map(p => p.toLowerCase());

    let language = localeParts[0];
    let languagesAvailable = Object.keys(UI);
    if (!(language in languagesAvailable)) {
        language = languagesAvailable[0];
    }
    let territoriesAvailable = Object.keys(UI[language]);
    let territory = territoriesAvailable[0];
    if (localeParts.length > 1 && (localeParts[1] in territoriesAvailable)) {
        territory = localeParts[1];
    }

    logger.log('DEBUG', 'UI: locale ' + locale + ' -> [' + language + ';' + territory + ']');

    return {
        language: language, 
        territory: territory
    }
}

function prompts({ key, params } = {}) {
    // attempt to extract the locale from the request if available
    let requestLocale = (this.event && this.event.request) ? this.event.request.locale : '';
    // parse the locale string (such as en_US) into its constituent parts    
    let {language, territory} = parseLocale({ locale: requestLocale });

    let found = UI[language][territory][(key || '').toUpperCase()];
    if (!found) {
        logger.log('WARN', 'UI: no prompts found for "' + key + '" (' + language + ')');        
    } else {
        if (params) {
            logger.log('DEBUG', 'UI: found prompts for "' + key 
                + "' params: " + JSON.stringify(params, null, 2) + ' (' + language + ')');
        } else {
            logger.log('DEBUG', 'UI: found prompts for "' + key
                + '" without params. (' + language + ')');
        }
    }

    if (found) {        
        let resultPrompt = { 
            outputSpeech: settings.pickRandom(found.outputSpeech) || '', 
            reprompt: settings.pickRandom(found.reprompt) || '',
            displayText: settings.pickRandom(found.displayText) || '',
            displayTitle: settings.pickRandom(found.displayTitle) || ''
        };
        if (params && Object.keys(params).length > 0) {
            // if any params were specified, apply to the prompts before returning
            resultPrompt.outputSpeech = sprintf(resultPrompt.outputSpeech, params);
            resultPrompt.reprompt = sprintf(resultPrompt.reprompt, params);
            resultPrompt.displayText = sprintf(resultPrompt.displayText, params);
            resultPrompt.displayTitle = sprintf(resultPrompt.displayTitle, params);
        }
        return resultPrompt;
    } else {
        return { outputSpeech: 'output speech for ' + key + ' was not found' };
    }
}
module.exports.prompts = prompts;
module.exports.parseLocale = parseLocale;