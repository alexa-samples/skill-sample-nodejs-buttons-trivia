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
 * ROLLCALL_EXIT_STATE
 */
const rollCallExitHandlers = Alexa.CreateStateHandler(settings.STATE.ROLLCALL_EXIT_STATE, {
    'PlayGame': function() {
        logger.log('DEBUG', 'STATE' + settings.STATE.ROLLCALL_EXIT_STATE + ' - PlayGame');
        let responseOptions = RollCall.start.call(this);
        this.emit('GlobalResponseReady', responseOptions);
    },
    'AMAZON.YesIntent' : function()  {
        logger.log('DEBUG', 'STATE' + settings.STATE.ROLLCALL_EXIT_STATE + ' - AMAZON.YesIntent');
        let responseOptions = RollCall.start.call(this);
        this.emit('GlobalResponseReady', responseOptions);
    },
    'AMAZON.NoIntent' : function () {
        logger.log('DEBUG', 'STATE' + settings.STATE.ROLLCALL_EXIT_STATE + ' - AMAZON.NoIntent');
        this.emit('AMAZON.StopIntent');
    },
    'AMAZON.HelpIntent': function() {
        logger.log('DEBUG', 'STATE' + settings.STATE.ROLLCALL_EXIT_STATE + ' - AMAZON.HelpIntent');
        RollCall.cancel.call(this);         
        let uiPrompts = this.getUIPrompts({
            key:'ROLL_CALL_EXIT_HELP'
        });
        this.response.speak(uiPrompts.outputSpeech).listen(uiPrompts.reprompt);
        this.display(uiPrompts);
        this.emit('GlobalResponseReady', { 'openMicrophone': true });
    },
    'AMAZON.StopIntent': function() {
        logger.log('DEBUG', 'STATE' + settings.STATE.ROLLCALL_EXIT_STATE + ' - AMAZON.StopIntent');
        let {outputSpeech, reprompt} = this.getUIPrompts({
            key: 'GOOD_BYE'
        });
        this.response.speak(outputSpeech);        
        this.emit('GlobalResponseReady', { 'openMicrophone': false, 'endSession': true });
    },    
    'AMAZON.CancelIntent': function() {
        logger.log('DEBUG', 'STATE' + settings.STATE.ROLLCALL_EXIT_STATE + ' - AMAZON.CancelIntent');        
        this.emitWithState('AMAZON.StopIntent');
    },
    'DontKnowIntent': function() { 
        logger.log('DEBUG', 'STATE' + settings.STATE.ROLLCALL_EXIT_STATE + ' - AMAZON.HelpIntent');
        this.emitWithState('AMAZON.HelpIntent');
    },
    'SessionEndedRequest': function() {
        logger.log('DEBUG', 'STATE' + settings.STATE.ROLLCALL_EXIT_STATE + ' - SessionEndedRequest');
        this.emit('GlobalSessionEndedRequestHandler');
    },
    'Unhandled': function() {
        this.emit('GlobalDefaultHandler');
    }
});

module.exports = rollCallExitHandlers;