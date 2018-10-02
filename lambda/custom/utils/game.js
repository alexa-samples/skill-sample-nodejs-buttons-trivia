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
var animations = require('../utils/animations.js');
var directives = require('../utils/directives.js');
var logger = require('../utils/logger.js');
var settings = require('../config/settings.js');
var stringSimilarity = require('string-similarity');

const gameHelper = {
  /*
   *  Given an answer string, attempt to remove unnecessary variance, such
   *  as casing, extra leading or trailing spacing, and convert single digit
   *  numbers to their word forms
   */
  normalizeAnswer: function (answer) {
    let normalizedAnswer = ('' + (answer || '')).toLowerCase();

    // remove any leading/trailing spaces
    normalizedAnswer = normalizedAnswer.replace(/^\s+|\s+$/g, '');

    // remove leading articles, such as 'a', 'an', 'the'
    normalizedAnswer = normalizedAnswer.replace(/^(a|an|the)\s+/g, '');

    switch (normalizedAnswer) {
      case '1':
        normalizedAnswer = 'one';
        break;
      case '2':
        normalizedAnswer = 'two';
        break;
      case '3':
        normalizedAnswer = 'three';
        break;
      case '4':
        normalizedAnswer = 'four';
        break;
      case '5':
        normalizedAnswer = 'five';
        break;
      case '6':
        normalizedAnswer = 'six';
        break;
      case '7':
        normalizedAnswer = 'seven';
        break;
      case '8':
        normalizedAnswer = 'eight';
        break;
      case '9':
        normalizedAnswer = 'nine';
        break;
      case '0':
        normalizedAnswer = 'zero';
        break;
    }
    return normalizedAnswer;
  },

  getFormattedScoreOutput: function (scoreInfo) {
    let output = scoreInfo.score == 1 ?
      "with a single correct answer, " :
      scoreInfo.score > 0 ?
      "with " + scoreInfo.score + " correct answers, " :
      "with no correct answers, ";

    if (scoreInfo.players.length == 1) {
      output += "is player " + scoreInfo.players[0];
    } else {
      output += "are players " + scoreInfo.players.slice(0, -1).join(', ');
      output += " and " + scoreInfo.players[scoreInfo.players.length - 1];
    }
    return output;
  },

  getFormattedScores: function (handlerInput, scores, numberOfPlayers) {
    logger.debug('Getting Formatted Scores for ' + numberOfPlayers + 'with Scores = ' + scores);
    let ctx = handlerInput.attributesManager.getRequestAttributes();
    const orderedScores =
      gameHelper.getOrderedScoreGroups(scores, numberOfPlayers);

    // new representation of scores
    // score =
    //      { "# correct" : [ 'player #', 'player #', ... ] },
    //      { "# correct" : [ 'player #', 'player #', ... ] },
    // for example
    //      { 5 : [ '1', '2' ] },
    //      { 3 : [ '4' ] },

    logger.debug(JSON.stringify(orderedScores));

    let outputSpeech = '';
    let responseMessage = {};
    if (numberOfPlayers > 1) {
      if (orderedScores.length == 0) {
        // handle the special case when there are no scores
        //   this should technically not happen
      } else if (orderedScores.length == 1) {
        // handle the special case when all players are tied
        if (orderedScores[0].score == 0) {
          responseMessage = ctx.t('SCORING_TIED_NO_ANSWERS');
        } else {
          if (orderedScores[0].score == 1) {
            responseMessage = ctx.t('SCORING_TIED_ONE_ANSWER');
          } else {
            responseMessage = ctx.t('SCORING_TIED_MULTIPLE_ANSWERS', {
              answer_count: orderedScores[0].score
            });
          }
        }
        outputSpeech = responseMessage.outputSpeech + ' ';
      } else {
        for (var placeNbr = 0; placeNbr < orderedScores.length; placeNbr++) {
          responseMessage = ctx.t('SCORING_MULTI_PLAYERS', {
            'place': (1 + placeNbr),
            'score_details': gameHelper.getFormattedScoreOutput(orderedScores[placeNbr])
          });
          outputSpeech += responseMessage.outputSpeech + ". ";
        }
      }
    } else {
      if (orderedScores[0].score == 0) {
        responseMessage = ctx.t('SCORING_SINGLE_PLAYER_NO_ANSWERS');
      } else if (orderedScores[0].score == 1) {
        responseMessage = ctx.t('SCORING_SINGLE_PLAYER_ONE_ANSWER');
      } else {
        responseMessage = ctx.t('SCORING_SINGLE_PLAYER_MULTIPLE_ANSWERS', {
          answer_count: orderedScores[0].score
        });
      }
      outputSpeech = responseMessage.outputSpeech + '. ';
    }
    return outputSpeech;
  },

  /*
   * Produces output speech that narrates the current round summary
   */
  generateRoundSummaryNarration: function (handlerInput, currentQuestion, scores, playerCount) {
    logger.debug('GenerateRoundSummaryNarration: question = ' + currentQuestion +
      ', playerCount = ' + playerCount);
    let ctx = handlerInput.attributesManager.getRequestAttributes();
    let questionsPerRound = parseInt(settings.GAME.QUESTIONS_PER_ROUND, 10);
    let roundsCompleted = (parseInt(currentQuestion, 10) - 1) / questionsPerRound;

    let introPrompt = ctx.t('GAME_ROUND_SUMMARY_INTRO', {
      round: roundsCompleted
    });
    let outroPrompt = ctx.t('GAME_ROUND_SUMMARY_OUTRO');

    let outputSpeech = "<break time='1s'/>" +
      introPrompt.outputSpeech + " " +
      gameHelper.getFormattedScores(handlerInput, scores, playerCount) +
      "<break time='1s'/>" +
      outroPrompt.outputSpeech +
      "<break time='1s'/>";
    return outputSpeech;
  },

  shuffleList: function (orderedList) {
    orderedList = orderedList.slice(0);
    for (let i = 0; i < orderedList.length - 1; i++) {
      let j = i + Math.floor(Math.random() * Math.floor(orderedList.length - i));
      let saveIndex = orderedList[i];
      orderedList[i] = orderedList[j];
      orderedList[j] = saveIndex;
    }
    return orderedList;
  },

  getOrderedScoreGroups: function (scores, numPlayers) {
    scores = scores || {};
    numPlayers = numPlayers || 1;

    let scoreGroups = {};
    for (var i = 1; i <= numPlayers; i++) {
      scores[i] = scores[i] || 0;
      let score = scores[i];
      if (!scoreGroups[score]) {
        scoreGroups[score] = [];
      }
      scoreGroups[score].push(i);
    }
    let scoreKeys = Object.keys(scoreGroups).sort().reverse();
    let orderedScoreGroups = [];
    for (var k = 0; k < scoreKeys.length; k++) {
      orderedScoreGroups.push({
        score: scoreKeys[k],
        players: scoreGroups[scoreKeys[k]]
      });
    }

    return orderedScoreGroups;
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
  endGame: function (handlerInput, resetGame) {
    logger.debug("GAME: end game");
    let ctx = handlerInput.attributesManager.getRequestAttributes();
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    // Clean the player state on the way out
    delete sessionAttributes.repeat;
    delete sessionAttributes.incorrectAnswerButtons;
    delete sessionAttributes.correct;
    delete sessionAttributes.answeringButton;
    delete sessionAttributes.answeringPlayer;

    let messageKey = resetGame ? 'GAME_FINISHED' : 'GAME_CANCELLED';
    let responseMessage = ctx.t(messageKey);

    ctx.render(handlerInput, responseMessage);
    ctx.openMicrophone = false;
    ctx.endSession = true;

    if (sessionAttributes.STATE === settings.STATE.BUTTON_GAME_STATE) {
      /** play the exit animations on all buttons in play  */
      ctx.directives.push(directives.GadgetController.setIdleAnimation({
        'targetGadgets': sessionAttributes.buttons.map(b => b.buttonId),
        'animations': settings.ANIMATIONS.EXIT_ANIMATION
      }));
    }

    if (resetGame) {
      /**
       * This means it's the end of the game! Let's reset and let them know the score
       */
      let finalScoresNarrative = gameHelper.getFormattedScores(handlerInput,
        sessionAttributes.scores, sessionAttributes.playerCount);

      let messageKey = sessionAttributes.STATE === settings.STATE.BUTTON_GAME_STATE ?
        'GAME_FINISHED_INTRO' : 'SINGLE_PLAYER_GAME_FINISHED_INTRO';
      let gameFinishedMessageAttributes = ctx.t(messageKey);

      // Give a pause if there is nothing to say before the summary
      if (ctx.outputSpeech.length === 0){
        ctx.outputSpeech.push("<break time='2s'/>");
      }
      ctx.outputSpeech.push(gameFinishedMessageAttributes.outputSpeech);
      ctx.outputSpeech.push(finalScoresNarrative);
      ctx.outputSpeech.push("<break time='1s'/>");
      ctx.outputSpeech.push(responseMessage.outputSpeech);

      // Clean up some attributes to set up for the next game
      delete sessionAttributes.answeringButton;
      delete sessionAttributes.answeringPlayer;
      delete sessionAttributes.currentQuestion;
      delete sessionAttributes.correct;
      delete sessionAttributes.scores;
      delete sessionAttributes.buttons;
      delete sessionAttributes.playerCount;
      delete sessionAttributes.repeat;
      delete sessionAttributes.incorrectAnswerButtons;
    } else {
      ctx.outputSpeech.push(responseMessage.outputSpeech);
    }
  },

  /**
   *  Helper function to stop the active input handler if one exists
   */
  stopCurrentInputHandler: function (handlerInput) {
    logger.debug('GAME: stop current input handler');
    let ctx = handlerInput.attributesManager.getRequestAttributes();
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    // Stop the previous InputHandler
    if (sessionAttributes.inputHandlerId) {
      ctx.directives.push(directives.GameEngine.stopInputHandler({
        'id': sessionAttributes.inputHandlerId
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
  handleGameInputEvent: function (handlerInput) {
    /**
     * For format of the GameEngine.InputHandlerEvent see
     * https://developer.amazon.com/docs/gadget-skills/receive-echo-button-events.html#receive
     */
    let {
      requestEnvelope,
      attributesManager
    } = handlerInput;
    let ctx = attributesManager.getRequestAttributes();
    let sessionAttributes = attributesManager.getSessionAttributes();
    let gameEngineEvents = requestEnvelope.request.events;

    logger.debug("GAME: handleGameInputEvent: " + JSON.stringify(gameEngineEvents));

    switch (gameEngineEvents[0].name) {
      case 'button_down_event':
        {
          logger.debug('Game: handle game input event: button_down_event');
          // Find the player from the list of stored buttons
          let player = sessionAttributes.buttons
            .find(b => b.buttonId == gameEngineEvents[0].inputEvents[0].gadgetId);
          // Capture that info in the attributes to be used later
          sessionAttributes.answeringButton = player.buttonId;
          sessionAttributes.answeringPlayer = player.count;

          let responseMessage = ctx.t('BUZZ_IN_DURING_PLAY', {
            player_number: player.count
          });

          // Figure out who the other players were so we can shut off their buttons
          var otherPlayers = sessionAttributes.buttons
            .filter(b => b.buttonId != gameEngineEvents[0].inputEvents[0].gadgetId)
            .map(b => b.buttonId);

          // Send directive to clear animations & restore defaults on the other players buttons
          Game.resetAnimations(handlerInput, otherPlayers);

          // Build the response
          ctx.outputSpeech.push(settings.AUDIO.BUZZ_IN_AUDIO);
          ctx.outputSpeech.push(responseMessage.outputSpeech);
          ctx.reprompt.push(responseMessage.reprompt);
          ctx.openMicrophone = true;
          return;
        }
      case 'time_out_event':
        {
          logger.debug('Game: handle game input event: time out waiting for button answer');

          delete sessionAttributes.correct;
          delete sessionAttributes.answeringButton;
          delete sessionAttributes.answeringPlayer;

          let responseMessage = ctx.t('ANSWER_TIME_OUT_DURING_PLAY');
          ctx.outputSpeech.push(responseMessage.outputSpeech);
          ctx.reprompt.push(responseMessage.reprompt);
          ctx.openMicrophone = true;
          return;
        }
      case 'answer_interstitial_event':
        {
          let questions = ctx.t('QUESTIONS');
          let currentQuestion = parseInt(sessionAttributes.currentQuestion || 1, 10);
          let shuffledQuestionIndex = sessionAttributes.orderedQuestions[currentQuestion - 1];
          let triviaQuestion = questions.find(q => q.index == shuffledQuestionIndex);

          let responseMessage = ctx.t('ASK_QUESTION_DISPLAY', {
            question_number: currentQuestion
          });
          responseMessage.displayText = triviaQuestion.question;
          ctx.render(handlerInput, responseMessage);

          Game.listenForAnswer(handlerInput);
          return;
        }
      default:
        logger.error("UNHANDLED EVENT " + gameEngineEvents[0].name);
    }
  },

  /**
   * Sends directives that reset buttons animations for specified buttons
   */
  resetAnimations: function (handlerInput, buttons) {
    logger.debug('GAME: reset animations');
    let ctx = handlerInput.attributesManager.getRequestAttributes();
    ctx.directives.push(directives.GadgetController.setIdleAnimation({
      'targetGadgets': buttons,
      'animations': animations.BasicAnimations.SolidAnimation(1, "black", 100)
    }));
    ctx.directives.push(directives.GadgetController.setButtonDownAnimation({
      'targetGadgets': buttons,
      'animations': animations.BasicAnimations.SolidAnimation(1, "black", 100)
    }));
  },

  /**
   * Function for receiving voice input to answer a question
   */
  answerQuestion: function (handlerInput) {
    logger.debug('GAME: answerQuestion');
    let {
      requestEnvelope,
      attributesManager
    } = handlerInput;
    let ctx = attributesManager.getRequestAttributes();
    let sessionAttributes = attributesManager.getSessionAttributes();

    if (!sessionAttributes.waitingForAnswer) {
      delete sessionAttributes.correct;
      let promptToContinue =
        parseInt(sessionAttributes.currentQuestion || 0, 10) <= settings.GAME.QUESTIONS_PER_GAME;
      if (promptToContinue) {
        Game.stopCurrentInputHandler(handlerInput);
        let responseMessage = ctx.t('ANSWER_BEFORE_QUESTION')
        ctx.outputSpeech.push(responseMessage.outputSpeech);
        ctx.reprompt.push(responseMessage.reprompt);
        ctx.openMicrophone = promptToContinue;
        return;
      } else {
        Game.endGame(handlerInput, true);
        return;
      }
    } else if ( sessionAttributes.STATE === settings.STATE.BUTTON_GAME_STATE &&
      (!sessionAttributes.answeringButton || !sessionAttributes.answeringPlayer)) {
      delete sessionAttributes.correct;
      let responseMessage = ctx.t('ANSWER_WITHOUT_BUTTONS');
      ctx.outputSpeech.push(responseMessage.outputSpeech);
      ctx.openMicrophone = false;
      return;
    }

    // get the answer out of the request event
    let answer = gameHelper.normalizeAnswer(requestEnvelope.request.intent.slots.answers.value);

    if (answer == '') {
      delete sessionAttributes.correct;
      let responseMessage = ctx.t('MISUNDERSTOOD_ANSWER');
      ctx.outputSpeech.push(responseMessage.outputSpeech);
      ctx.reprompt.push(responseMessage.reprompt);
      ctx.openMicrophone = true;
      return;
    }

    sessionAttributes.waitingForAnswer = false;

    // get the current question from the question bank so we can compare answers
    let currentQuestionIndex = parseInt(sessionAttributes.currentQuestion || 1, 10);
    let shuffledQuestionIndex = sessionAttributes.orderedQuestions[currentQuestionIndex - 1];
    let questions = ctx.t('QUESTIONS');
    let currentQuestion = questions.find(q => q.index == shuffledQuestionIndex);
    // get the answers
    let answers = currentQuestion.answers.map(a => gameHelper.normalizeAnswer(a));
    // get the correct answer
    let correct_answer = gameHelper.normalizeAnswer(currentQuestion.correct_answer);
    // use a string similarity match to determine if the spoken answer is close to one of the supplied values
    var matches = stringSimilarity.findBestMatch(answer, answers);

    logger.debug("COMPARING '" + answer + "' to [" + answers + "]: (" + matches.ratings.length + " matches)");
    // flag to determine if we have a match
    var answered = false;
    // loop through all the matches, in case there is more than one that is good enough to consider
    for (var i = 0; i < matches.ratings.length; ++i) {
      var match = matches.ratings[i];
      if (match.rating > settings.GAME.ANSWER_SIMILARITY) {
        // Answer is the correct answer
        if (match.target == correct_answer) {
          // move onto the next question
          sessionAttributes.currentQuestion += 1;

          // check to see if we are keeping score yet
          if (!('scores' in sessionAttributes)) {
            sessionAttributes.scores = {};
            sessionAttributes.scores[sessionAttributes.answeringPlayer] = 1;
            // if this player already has a score, increment it
          } else if (sessionAttributes.answeringPlayer in sessionAttributes.scores) {
            sessionAttributes.scores[sessionAttributes.answeringPlayer] += 1;
            // otherwise just start a new score
          } else {
            sessionAttributes.scores[sessionAttributes.answeringPlayer] = 1;
          }

          let messageKey = sessionAttributes.STATE === settings.STATE.BUTTONLESS_GAME_STATE ?
            'SINGLE_PLAYER_CORRECT_ANSWER_DURING_PLAY' : 'CORRECT_ANSWER_DURING_PLAY';
          let responseMessage = ctx.t(messageKey, {
            player_number: sessionAttributes.answeringPlayer
          });

          // To change the correct answer sound, replace AUDIO.CORRECT_ANSWER_AUDIO
          // with your audio clip by updating config/settings.js
          ctx.outputSpeech.push(settings.AUDIO.CORRECT_ANSWER_AUDIO);
          ctx.outputSpeech.push(responseMessage.outputSpeech)
          // mark that the user answered this correct
          sessionAttributes.correct = true;

          // if we are asking this question for the Nth time, where N > 1, delete that flag
          delete sessionAttributes.repeat;
          delete sessionAttributes.incorrectAnswerButtons;

          logger.debug("Answer provided matched one of the expected answers!");
          answered = true;
          break;
        }
      }
    }
    // If we looped through the answer without a match
    if (answered === false) {
      if (sessionAttributes.STATE === settings.STATE.BUTTONLESS_GAME_STATE) {
        // In a buttonless game we will not repeat the question, just mark is wrong and move to the next one
        sessionAttributes.currentQuestion += 1;
        let responseMessage = ctx.t('SINGLE_PLAYER_INCORRECT_ANSWER_DURING_PLAY', {
          player_number: sessionAttributes.answeringPlayer
        });
        ctx.outputSpeech.push(settings.AUDIO.INCORRECT_ANSWER_AUDIO);
        ctx.outputSpeech.push(responseMessage.outputSpeech);

        if (settings.GAME.NOTIFY_CORRECT_ANSWER){
          responseMessage = ctx.t('NOTIFY_CORRECT_ANSWER', {
            correct_answer: correct_answer
          });
          ctx.outputSpeech.push(responseMessage.outputSpeech);
        }

        sessionAttributes.correct = false;
      } else if (typeof sessionAttributes.repeat === 'undefined' ||
        (sessionAttributes.repeat < settings.GAME.MAX_ANSWERS_PER_QUESTION &&
        sessionAttributes.repeat + 1 < sessionAttributes.playerCount)) {
        // We will repeat if we've asked less the max answers per question and there is at least one player
        // available to answer (each player only get's one shot at answering)
        logger.debug("Answer provided doesn't seem to match any of the expected answers -> repeat question");
        // Flag this question for repeat
        let repeatCount = sessionAttributes.repeat || 0;
        sessionAttributes.repeat = parseInt(repeatCount, 10) + 1;

        // But don't let the same player answer again
        if (sessionAttributes.incorrectAnswerButtons){
          sessionAttributes.incorrectAnswerButtons.push(sessionAttributes.answeringButton);
        } else {
          sessionAttributes.incorrectAnswerButtons = [sessionAttributes.answeringButton];
        }

        let responseMessage = ctx.t('INCORRECT_ANSWER_DURING_PLAY', {
          player_number: sessionAttributes.answeringPlayer
        });
        ctx.outputSpeech.push(settings.AUDIO.INCORRECT_ANSWER_AUDIO);
        ctx.outputSpeech.push(responseMessage.outputSpeech)
        sessionAttributes.correct = false;
      } else {
        sessionAttributes.currentQuestion += 1;

        logger.debug("Answer provided doesn't seem to match any of the expected answers -> skip question");

        delete sessionAttributes.repeat;
        delete sessionAttributes.incorrectAnswerButtons;

        let responseMessage;
        if (sessionAttributes.currentQuestion >= settings.GAME.QUESTIONS_PER_GAME) {
          // Don't add the try another question dialog if we're at the end of the game
          responseMessage = ctx.t('INCORRECT_ANSWER_DURING_PLAY', {
            player_number: sessionAttributes.answeringPlayer
          });
        } else {
          responseMessage = ctx.t('INCORRECT_ANSWER_TOO_MANY_TIMES', {
            player_number: sessionAttributes.answeringPlayer
          });
        }

        ctx.outputSpeech.push(settings.AUDIO.INCORRECT_ANSWER_AUDIO);
        ctx.outputSpeech.push(responseMessage.outputSpeech);

        if (settings.GAME.NOTIFY_CORRECT_ANSWER){
          responseMessage = ctx.t('NOTIFY_CORRECT_ANSWER', {
            correct_answer: correct_answer
          });
          ctx.outputSpeech.push(responseMessage.outputSpeech);
        }

        ctx.outputSpeech.push("<break time='2s'/>");
        sessionAttributes.correct = false;
      }
    }
    // Move on to asking the same/next question depending on the state
    Game.askQuestion(handlerInput, true);
  },
  /**
   * Function: askQuestion
   *
   * Function to gather the built responses, add them to the overall response and handle the
   * logic of retrieving and asking the next/same question depending on if the user got it right.
   */
  askQuestion: function (handlerInput, isFollowingAnswer) {
    let {
      requestEnvelope,
      attributesManager
    } = handlerInput;
    let sessionAttributes = attributesManager.getSessionAttributes();
    let ctx = attributesManager.getRequestAttributes();
    let questions = ctx.t('QUESTIONS');

    logger.debug('GAME: askQuestion (currentQuestion = ' + sessionAttributes.currentQuestion + ')');

    if (!isFollowingAnswer){
      // Clean repeat state
      delete sessionAttributes.repeat;
      delete sessionAttributes.incorrectAnswerButtons;
    }

    sessionAttributes.inputHandlerId = requestEnvelope.request.requestId;

    let currentQuestion;
    if ('currentQuestion' in sessionAttributes) {
      currentQuestion = parseInt(sessionAttributes.currentQuestion, 10);
    } else {
      currentQuestion = 1;
      sessionAttributes.currentQuestion = 1;
    }

    if (!sessionAttributes.orderedQuestions ||
      (currentQuestion === 1 && !('repeat' in sessionAttributes))) {
      if (settings.GAME.SHUFFLE_QUESTIONS) {
        logger.debug('GamePlay: producing ordered question list for new game (using shuffling)!');
        // if this is the first question, then shuffle the questions
        let orderedQuestions = gameHelper.shuffleList(questions.map(q => q.index))
          .slice(0, settings.GAME.QUESTIONS_PER_GAME);
        // and store the ordered list of questions in the attributes
        sessionAttributes.orderedQuestions = orderedQuestions;
      } else {
        logger.debug('GamePlay: producing ordered question list for new game (shuffling disabled)!');
        sessionAttributes.orderedQuestions = questions.map(q => q.index)
          .slice(0, settings.GAME.QUESTIONS_PER_GAME);
      }
    }

    let shuffledQuestionIndex = sessionAttributes.orderedQuestions[currentQuestion - 1];
    let nextQuestion = questions.find(q => q.index == shuffledQuestionIndex);
    logger.debug('Ask question: ' + currentQuestion + ' of ' + settings.GAME.QUESTIONS_PER_GAME +
      ', next question: ' + JSON.stringify(nextQuestion, null, 2));
    if (!nextQuestion || currentQuestion > settings.GAME.QUESTIONS_PER_GAME) {
      /* call the 'endGame' helper to process the end of game logic */
      return Game.endGame(handlerInput, true);
    } else {
      let interstitialDelay = isFollowingAnswer ? 6000 : 3000;
      let questionsPerRound = parseInt(settings.GAME.QUESTIONS_PER_ROUND, 10);

      // check to see if it's time to generate and recite a game round summary
      //  if it is time, append the round summary to the outputSpeech
      //  before we go further and generate the question outputSpeech
      if (currentQuestion > 2 &&
        !sessionAttributes.repeat &&
        currentQuestion < settings.GAME.QUESTIONS_PER_GAME &&
        ((currentQuestion - 1) % questionsPerRound) === 0) {
        interstitialDelay += 12000;
        let roundSummary = gameHelper.generateRoundSummaryNarration(handlerInput, sessionAttributes.currentQuestion,
          sessionAttributes.scores, sessionAttributes.playerCount);
        ctx.outputSpeech.push(roundSummary);
      }

      if ('correct' in sessionAttributes) {
        // player answered the question - either correctly, or incorrectly
        let messageKey = sessionAttributes.STATE === settings.STATE.BUTTON_GAME_STATE ?
          'ANSWER_QUESTION_INCORRECT_DISPLAY' : 'SINGLE_PLAYER_ANSWER_QUESTION_INCORRECT_DISPLAY';
        let image = settings.pickRandom(settings.IMAGES.INCORRECT_ANSWER_IMAGES);
        if (sessionAttributes.correct) {
          messageKey = sessionAttributes.STATE === settings.STATE.BUTTON_GAME_STATE ?
          'ANSWER_QUESTION_CORRECT_DISPLAY' : 'SINGLE_PLAYER_ANSWER_QUESTION_CORRECT_DISPLAY';
          image = settings.pickRandom(settings.IMAGES.CORRECT_ANSWER_IMAGES);
        }
        let responseMessage = ctx.t(messageKey, {
          player_number: sessionAttributes.answeringPlayer
        });
        responseMessage.image = image;
        ctx.render(handlerInput, responseMessage);
      } else {
        // if 'correct' is missing from attributes, this is the first question asked
        let messageKey = currentQuestion === 1 ? 'ASK_FIRST_QUESTION_NEW_GAME_DISPLAY' : 'ASK_FIRST_QUESTION_RESUME_DISPLAY';
        let responseMessage = ctx.t(messageKey);
        ctx.render(handlerInput, responseMessage);
      }

      // Use a shorter break for buttonless games
      let breakTime = sessionAttributes.STATE === settings.STATE.BUTTON_GAME_STATE ? 4 : 1;
      let answers = `<break time='${breakTime}s'/> Is it `;
      if (nextQuestion.answers) {
        if (nextQuestion.answers.length > 1) {
          answers += nextQuestion.answers.slice(0, -1).join(', ') + ", or, " +
            nextQuestion.answers[nextQuestion.answers.length - 1];
        } else {
          answers = nextQuestion.answers[0];
        }
        answers += "?";
      }
      ctx.outputSpeech.push(nextQuestion.question);
      ctx.outputSpeech.push(answers);

      // add waiting sound only for button games, add a reprompt for buttonless
      if (sessionAttributes.STATE === settings.STATE.BUTTON_GAME_STATE) {
        ctx.outputSpeech.push(settings.AUDIO.WAITING_FOR_BUZZ_IN_AUDIO);
      } else {
        ctx.reprompt.push(answers);
      }

      if (sessionAttributes.STATE === settings.STATE.BUTTON_GAME_STATE){
        // Button game - prep the buttons for buzz in
        Game.animateButtonsAfterAnswer(handlerInput);
        Game.sendAnswerInterstitial(handlerInput, interstitialDelay);

        delete sessionAttributes.answeringButton;
        delete sessionAttributes.answeringPlayer;
      } else {
        // Buttonless game - be ready for an answer immediately from the only player
        sessionAttributes.waitingForAnswer = true;
        sessionAttributes.answeringPlayer = 1;
        ctx.openMicrophone = true;

        // Buttonless game - render the ui for the question immediately as well
        let responseMessage = ctx.t('ASK_QUESTION_DISPLAY', {
          question_number: currentQuestion
        });
        responseMessage.displayText = nextQuestion.question;
        if (typeof sessionAttributes.correct !== 'undefined') {
          responseMessage.image = sessionAttributes.correct ?
          settings.pickRandom(settings.IMAGES.CORRECT_ANSWER_IMAGES) :
          settings.pickRandom(settings.IMAGES.INCORRECT_ANSWER_IMAGES);
        }
        ctx.render(handlerInput, responseMessage);
      }

      delete sessionAttributes.correct;
    }
  },

  /*
   * Starts an input handler and starts listening for button presses, to answer the question
   */
  listenForAnswer: function (handlerInput) {
    logger.debug('GAME: listen for answer');
    let {
      requestEnvelope,
      attributesManager
    } = handlerInput;
    let sessionAttributes = attributesManager.getSessionAttributes();
    let ctx = attributesManager.getRequestAttributes();


    sessionAttributes.inputHandlerId = requestEnvelope.request.requestId;
    sessionAttributes.waitingForAnswer = true;
    ctx.openMicrophone = false;

    // create a list of proxies of the same length as the number of buttons we're trying to match
    let gadgetIds = sessionAttributes.buttons.map((b, i) => b.buttonId);

    // Remove buttons that have answered this question incorrectly
    gadgetIds = gadgetIds.filter(gadgetId => !sessionAttributes.incorrectAnswerButtons ||
      !sessionAttributes.incorrectAnswerButtons.includes(gadgetId));

    ctx.directives.push(directives.GameEngine.startInputHandler({
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
    ctx.directives.push(directives.GadgetController.setButtonDownAnimation({
      'targetGadgets': gadgetIds,
      'animations': settings.ANIMATIONS.BUZZ_IN_ANIMATION
    }));

    // everyone gets the same animations
    ctx.directives.push(directives.GadgetController.setIdleAnimation({
      'targetGadgets': gadgetIds,
      'animations': settings.ANIMATIONS.LISTEN_FOR_ANSWER_ANIMATION
    }));
  },

  /*
   * Starts an input handler and starts listening for button presses, to answer the question
   */
  sendAnswerInterstitial: function (handlerInput, interstitialDelay) {
    logger.debug('GAME: answer interstitial');
    let {
      requestEnvelope,
      attributesManager
    } = handlerInput;
    let sessionAttributes = attributesManager.getSessionAttributes();
    let ctx = attributesManager.getRequestAttributes();

    sessionAttributes.inputHandlerId = requestEnvelope.request.requestId;

    ctx.directives.push(directives.GameEngine.startInputHandler({
      'timeout': interstitialDelay,
      'recognizers': {},
      'events': {
        'answer_interstitial_event': {
          'meets': ['timed out'],
          'reports': 'history',
          'shouldEndInputHandler': true
        }
      }
    }));

    ctx.openMicrophone = false;
  },

  /*
   * Starts an input handler and starts listening for button presses, to answer the question
   */
  animateButtonsAfterAnswer: function (handlerInput) {
    logger.debug('GAME: animate buttons after answer');
    let {
      requestEnvelope,
      attributesManager
    } = handlerInput;
    let sessionAttributes = attributesManager.getSessionAttributes();
    let ctx = attributesManager.getRequestAttributes();

    sessionAttributes.inputHandlerId = requestEnvelope.request.requestId;

    // Send light animations for buttons, depenending on status
    let allPlayers = sessionAttributes.buttons.map(b => b.buttonId);
    if ('correct' in sessionAttributes) {
      let animation = [];
      if (sessionAttributes.correct) {
        animation = settings.ANIMATIONS.CORRECT_ANSWER_ANIMATION;
      } else {
        animation = settings.ANIMATIONS.INCORRECT_ANSWER_ANIMATION;
      }
      // get other players who didn't answer
      // excluding others who have already answered incorrectly
      var otherPlayers = sessionAttributes.buttons
        .filter(b => b.buttonId != sessionAttributes.answeringButton &&
          (!sessionAttributes.incorrectAnswerButtons ||
          !sessionAttributes.incorrectAnswerButtons.includes(b.buttonId)))
        .map(b => b.buttonId);

      if (sessionAttributes.answeringButton) {
        ctx.directives.push(directives.GadgetController.setIdleAnimation({
          'targetGadgets': [sessionAttributes.answeringButton],
          'animations': animation
        }));
      }
      if (otherPlayers && otherPlayers.length > 0) {
        ctx.directives.push(directives.GadgetController.setIdleAnimation({
          'targetGadgets': otherPlayers,
          'animations': settings.ANIMATIONS.BUZZ_IN_OTHER_PLAYERS_ANIMATION
        }));
      }
    } else {
      // everyone gets the same animations
      ctx.directives.push(directives.GadgetController.setIdleAnimation({
        'targetGadgets': allPlayers,
        'animations': settings.ANIMATIONS.BUZZ_IN_OTHER_PLAYERS_ANIMATION
      }));
    }

    // Send Button Down Event
    ctx.directives.push(directives.GadgetController.setButtonDownAnimation({
      'targetGadgets': allPlayers,
      'animations': animations.BasicAnimations.SolidAnimation(1, 'black', 100)
    }));

    ctx.openMicrophone = false;
  }
};
module.exports = Game;