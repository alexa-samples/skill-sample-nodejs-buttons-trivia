"use strict";
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

const animations = require('../utils/animations.js');

/**
 * Settings file
 *
 * Use this file to configure the behavior of your trivia game
 */
module.exports = (function () {
  /**
   * APP_ID:
   *  The skill ID to be matched against requests for confirmation.
   *  It helps protect against spamming your skill.
   *  Replace this with the value of your skill ID to enable this protection.
   */
  const APP_ID = '';

  /**
   * GAME - Game settings
   *      MAX_PLAYERS - A number between 2 and 4
   *      QUESTIONS - The total number of questions you will ask per game. Must be
   *          less than or equal to the total number of questions in config/questions.js
   *      QUESTIONS_PER_ROUND - Number of questions you want to ask before giving a game summary.
   *          Should divide evenly into the total number of questions.
   *      ANSWER_SIMILARITY - A percentage value marking how similar an answer need to be to the
   *          correct answer to be considered correct. Used with the string-similarity package
   *          See github readme for setup instructions
   *      MAX_ANSWERS_PER_QUESTION - Maximum number of answers allowed for each question.
   *      SHUFFLE_QUESTIONS - if enabled, questions are presented in randomized order, otherwise
   *          each question is presented in the same answer as they are listed in the questions file.
   *      NOTIFY_CORRECT_ANSWER - if enabled Alexa will let the players know what the correct answer
   *          was if everyone has answered incorrectly
   */
  const GAME_OPTIONS = {
    MAX_PLAYERS: 4,
    QUESTIONS_PER_GAME: 6,
    QUESTIONS_PER_ROUND: 2,
    ANSWER_SIMILARITY: .60,
    MAX_ANSWERS_PER_QUESTION: 4,
    SHUFFLE_QUESTIONS: true,
    NOTIFY_CORRECT_ANSWER: true
  };

  /**
   * ROLLCALL - Control how players register themselves for the game
   *      QUICK_START
   *          Allows for all buttons up to GAME.MAX_PLAYERS to press their buttons during
   *          roll call before the skill will decide they are registered
   *      NAMED_PLAYERS
   *          On each button press up to GAME.MAX_PLAYERS, acknowledge the button press
   *          and call the player out by name
   */
  const ROLLCALL_STATES = {
    QUICK_START: false,
    NAMED_PLAYERS: true
  };

  /**
   * STORAGE.SESSION_TABLE:
   *  The name of the table in DynamoDB where you want to store session and game data.
   *  You can leave this empty if you do not wish to use DynamoDB to automatically
   *  store game data between sessions after each request.
   */
  const STORAGE = {
    // Session persistence
    SESSION_TABLE: 'better-with-buttons-trivia'
  };

  /**
   * COLORS - Change the behavior and colors of the buttons
   *
   *      QUESTION_COLOR - The color the buttons will be when a question is asked.
   *          This is the signal to the users that they should buzz in
   *      BUZZ_IN_COLOR - The color to change the buttons to when someone buzzes in
   *      MISSED_BUZZ_IN - This is the color other buttons will turn when the first player
   *          buzzes in. In this case 'black' is off
   *      INCORRECT_COLOR - The color the button will blink when a player gets a question correct
   *      CORRECT_COLOR - The color a button will blink when the answering player gets the question
   *          correct.
   */
  const COLORS = Object.freeze({
    // Color you want the buttons to be when expecting input
    QUESTION_COLOR: 'purple',
    // Color you want the first button to chime in to be
    BUZZ_IN_COLOR: 'blue',
    // Color you want the other buttons who didn't chime in
    MISSED_BUZZ_IN: 'black',
    // Incorrect answer color
    INCORRECT_COLOR: 'red',
    // Correct color
    CORRECT_COLOR: 'green',
    // Exit color
    EXIT_COLOR: 'white'
  });

  /**
   * AUDIO - Links to sound effects used in the game
   *      ROLL_CALL_COMPLETE
   *          Once all players have buzzed in, play this sound
   *      WAITING_FOR_BUZZ_IN_AUDIO
   *          A ticking sound used to indicate that the skill is waiting for a button press
   *      BUZZ_IN_AUDIO
   *          The sound to play when a user 'buzzes in' and is ready to answer a question
   *      CORRECT_ANSWER_AUDIO
   *          A sound effect to play when the users answer correctly
   *      INCORRECT_ANSWER_AUDIO
   *          The sound effect to play when a user answers incorrectly
   */
  const AUDIO = Object.freeze({
    WAITING_FOR_ROLL_CALL_AUDIO: "<audio src='https://s3.amazonaws.com/ask-soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_countdown_loop_32s_full_01.mp3'/>",
    ROLL_CALL_COMPLETE: "<audio src='https://s3.amazonaws.com/ask-soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_intro_01.mp3'/>",
    WAITING_FOR_BUZZ_IN_AUDIO: "<audio src='https://s3.amazonaws.com/ask-soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_waiting_loop_30s_01.mp3'/>",
    BUZZ_IN_AUDIO: "<audio src='https://s3.amazonaws.com/ask-soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_neutral_response_01.mp3'/>",
    CORRECT_ANSWER_AUDIO: "<audio src='https://s3.amazonaws.com/ask-soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_positive_response_02.mp3'/>",
    INCORRECT_ANSWER_AUDIO: "<audio src='https://s3.amazonaws.com/ask-soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_negative_response_02.mp3'/>"
  });

  /**
   * A set of images to show on backgrounds and in display templates when the skill
   * is used with a device with a screen like the Echo Show or Echo Spot
   * https://developer.amazon.com/docs/custom-skills/display-interface-reference.html
   *
   * The skill template chooses images randomly from each array to provide some
   * variety for the user.
   */
  const IMAGES = Object.freeze({
    BACKGROUND_IMAGES: [
      'https://d2vbr0xakfjx9a.cloudfront.net/bg1.jpg',
      'https://d2vbr0xakfjx9a.cloudfront.net/bg2.jpg'
    ],
    CORRECT_ANSWER_IMAGES: [
      'https://d2vbr0xakfjx9a.cloudfront.net/correct1.png',
      'https://d2vbr0xakfjx9a.cloudfront.net/correct2.png',
      'https://d2vbr0xakfjx9a.cloudfront.net/correct3.png',
      'https://d2vbr0xakfjx9a.cloudfront.net/correct4.png'
    ],
    INCORRECT_ANSWER_IMAGES: [
      'https://d2vbr0xakfjx9a.cloudfront.net/wrong1.png',
      'https://d2vbr0xakfjx9a.cloudfront.net/wrong2.png',
      'https://d2vbr0xakfjx9a.cloudfront.net/wrong3.png',
    ]
  });

  /**
   * ANIMATIONS - set up light animations that will be used throughout the game
   */
  const GAME_ANIMATIONS = Object.freeze({
    // Intro - Plays when a customer opens a Skill.
    'INTRO_ANIMATION': animations.ComplexAnimations
      .SpectrumAnimation(10, ["red", "orange", "yellow"]),

    // ** Pre-Roll Call Animation - Buttons that are connected light up.
    'PRE_ROLL_CALL_ANIMATION': animations.BasicAnimations
      .FadeInAnimation(1, "white", 40000),

    // ** Pre-Roll Call Animation - Buttons that are connected light up.
    'ROLL_CALL_BUTTON_ADDED_ANIMATION': animations.BasicAnimations
      .SolidAnimation(1, "green", 40000),

    // ** Roll Call Complete Animation - displays on all buttons in play
    'ROLL_CALL_COMPLETE_ANIMATION': animations.ComplexAnimations
      .SpectrumAnimation(6, ['red', 'orange', 'green', 'yellow', 'white']),

    // ** Roll Call Check-In Animation - buttons change state when added via roll call.
    'ROLL_CALL_CHECKIN_ANIMATION': animations.BasicAnimations
      .SolidAnimation(1, "green", 3000),

    // Buzz In Animation - plays on answering players button
    'BUZZ_IN_ANIMATION': animations.BasicAnimations
      .SolidAnimation(1, COLORS.BUZZ_IN_COLOR, 6000),

    // Buzz In Animation - played for non-answering players buttons
    'BUZZ_IN_OTHER_PLAYERS_ANIMATION': animations.BasicAnimations
      .SolidAnimation(1, 'black', 200),

    // Listen For Answer Animation - played to all buttons after a question is asked
    'LISTEN_FOR_ANSWER_ANIMATION': animations.BasicAnimations
      .SolidAnimation(1, COLORS.QUESTION_COLOR, 26000),

    // Wrong Answer Animation - Player gets something wrong.
    'INCORRECT_ANSWER_ANIMATION': animations.ComplexAnimations
      .AnswerAnimation(COLORS.INCORRECT_COLOR, 'black', 1000),

    // Right Answer Animation - Player gets something right.
    'CORRECT_ANSWER_ANIMATION': animations.ComplexAnimations
      .AnswerAnimation(COLORS.CORRECT_COLOR, 'black', 1000),

    // Exit Animation - plays when the exiting the skill
    'EXIT_ANIMATION': animations.BasicAnimations
      .FadeOutAnimation(1, COLORS.EXIT_COLOR, 1500),
  });

  /*
   * Define the different states that this skill can be in. For the Trivia skill,
   * we define ROLLCALL, GAME_LOOP, ROLLCALL_EXIT, and the initial state called
   * START_GAME_STATE (which maps to the initial state).
   */
  const SKILL_STATES = {
    // Start mode performs roll call and button registration.
    // https://developer.amazon.com/docs/gadget-skills/discover-echo-buttons.html
    START_GAME_STATE: '',
    ROLLCALL_STATE: '_ROLLCALL',
    BUTTON_GAME_STATE: '_BUTTON_GAME',
    BUTTONLESS_GAME_STATE: '_BUTTONLESS_GAME'
  };

  // return the externally exposed settings object
  return Object.freeze({
    APP_ID: APP_ID,
    STORAGE: STORAGE,
    ROLLCALL: ROLLCALL_STATES,
    AUDIO: AUDIO,
    IMAGES: IMAGES,
    GAME: GAME_OPTIONS,
    COLORS: COLORS,
    ANIMATIONS: GAME_ANIMATIONS,
    STATE: SKILL_STATES,
    LOG_LEVEL: 'DEBUG',
    pickRandom(arry) {
      if (Array.isArray(arry)) {
        return arry[Math.floor(Math.random() * Math.floor(arry.length))]
      }
      return arry;
    }
  });
})();