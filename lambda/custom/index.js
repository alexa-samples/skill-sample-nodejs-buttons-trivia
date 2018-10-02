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

const Alexa = require('ask-sdk');
const settings = require('./config/settings.js');

/**
 * Import interceptors and handlers for the different skill states.
 */
const GlobalHandlers = require('./handlers/globalHandlers');
const StartHandlers = require('./handlers/startHandlers.js');
const RollCallHandlers = require('./handlers/rollCallHandlers.js');
const GamePlayHandlers = require('./handlers/gamePlayHandlers.js');

/**
 * Lambda setup.
 */
exports.handler = function (event, context) {
  let factory = Alexa.SkillBuilders.standard()
    .addRequestHandlers(
      GamePlayHandlers.AnswerHandler,
      GamePlayHandlers.DontKnowNextHandler,
      GamePlayHandlers.GameEventHandler,
      GamePlayHandlers.PlayGameHandler,
      GamePlayHandlers.EndGameHandler,
      GamePlayHandlers.YesHandler,
      RollCallHandlers.YesHandler,
      RollCallHandlers.NoHandler,
      RollCallHandlers.GameEventHandler,
      StartHandlers.PlayerCountHandler,
      StartHandlers.YesHandler,
      StartHandlers.NoHandler,
      StartHandlers.LaunchPlayGameHandler,
      StartHandlers.StartNewGameHandler,
      GlobalHandlers.HelpHandler,
      GlobalHandlers.StopCancelHandler,
      GlobalHandlers.SessionEndedRequestHandler,
      GlobalHandlers.DefaultHandler
    )
    .addRequestInterceptors(GlobalHandlers.RequestInterceptor)
    .addResponseInterceptors(GlobalHandlers.ResponseInterceptor)
    .addErrorHandlers(GlobalHandlers.ErrorHandler);

  if (settings.APP_ID) {
    factory.withSkillId(settings.APP_ID);
  }

  console.log("===ENV VAR DYNAMODBTABLE===: " + process.env.DYNAMODB_TABLE_NAME);
  if (process.env.DYNAMODB_TABLE_NAME && process.env.DYNAMODB_TABLE_NAME !== '') {
    settings.STORAGE.SESSION_TABLE = process.env.DYNAMODB_TABLE_NAME;
    console.log("===STORAGE SESSION TABLE Set to===: " + settings.STORAGE.SESSION_TABLE);
  }

  if (settings.STORAGE.SESSION_TABLE) {
    factory.withTableName(settings.STORAGE.SESSION_TABLE)
      .withAutoCreateTable(true);
  }

  let skill = factory.create();

  return skill.invoke(event, context);
}