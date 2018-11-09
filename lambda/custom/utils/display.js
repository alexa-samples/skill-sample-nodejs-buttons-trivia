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
const Alexa = require("ask-sdk");
const settings = require("../config/settings.js");
const logger = require("../utils/logger.js");

const APL_DIRECTIVE_TYPE = "Alexa.Presentation.APL.RenderDocument";
const DEFAULT_SCREEN = require("./screens/default.json");
const IMAGE_SCREEN = require("./screens/image.json");
const QUESTION_SCREEN = require("./screens/question.json");

const DisplayHelper = {
  toTitleCase: function (str) {
    if (str){
      str = str.toLowerCase().split(' ');
      for (var i = 0; i < str.length; i++) {
        str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1);
      }
    }
    return str ? str.join(' ') : str;
  }
}

const Display = {
  render: function(handlerInput, responseMessage) {
    let ctx = handlerInput.attributesManager.getRequestAttributes();
    let gameTitle = ctx.t('GAME_TITLE');
    let text = Array.isArray(responseMessage.displayText) ?
      settings.pickRandom(responseMessage.displayText) : responseMessage.displayText;

    if (responseMessage.image) {

      logger.debug('=== Render Image===');

      ctx.directives.push({
        type: APL_DIRECTIVE_TYPE,
        token: 'btn-trivia-img',
        version: '1.0',
        document: IMAGE_SCREEN,
        datasources: {
          buttonTrivia: {
            type: "object",
            objectId: "buttonTriviaImage",
            properties: {
              title: gameTitle,
              subtitle: responseMessage.displayTitle,
              icon: settings.IMAGES.GAME_ICON,
              background: settings.IMAGES.BACKGROUND_IMAGES[0],
              text: text,
              image: responseMessage.image
            }
          }
        }
      });
    } else if (responseMessage.question) {

      logger.debug('=== Render Question===');

      ctx.directives.push({
        type: APL_DIRECTIVE_TYPE,
        token: 'btn-trivia-question',
        version: '1.0',
        document: QUESTION_SCREEN,
        datasources: {
          buttonTrivia: {
            type: "object",
            objectId: "buttonTriviaDefault",
            properties: {
              title: gameTitle,
              subtitle: responseMessage.displayTitle,
              icon: settings.IMAGES.GAME_ICON,
              background: settings.IMAGES.BACKGROUND_IMAGES[0],
              answerBoxColor: "#592aa5",
              answerBoxBorderColor: "#77308d",
              question: {
                    questionText: responseMessage.question,
                    answerA: DisplayHelper.toTitleCase(responseMessage.answers[0]),
                    answerB: DisplayHelper.toTitleCase(responseMessage.answers[1]),
                    answerC: DisplayHelper.toTitleCase(responseMessage.answers[2]),
                    answerD: DisplayHelper.toTitleCase(responseMessage.answers[3])
                }
            }
          }
        }
      });
    } else {

      logger.debug('=== Render Plain===');

      ctx.directives.push({
        type: APL_DIRECTIVE_TYPE,
        token: 'btn-trivia',
        version: '1.0',
        document: DEFAULT_SCREEN,
        datasources: {
          buttonTrivia: {
            type: "object",
            objectId: "buttonTriviaDefault",
            properties: {
              title: gameTitle,
              subtitle: responseMessage.displayTitle,
              icon: settings.IMAGES.GAME_ICON,
              background: settings.IMAGES.BACKGROUND_IMAGES[0],
              text: text
            }
          }
        }
      });
    }
    logger.info(JSON.stringify(responseMessage, null, 2));
  }
};

module.exports = Display;
