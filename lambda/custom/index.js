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

const Alexa         = require('alexa-sdk');
const settings      = require('./config/settings.js');
const UI            = require('./dialog/uiprompts.js');
const logger        = require('./utils/logger.js');
const DisplayUtil   = require('./utils/displayUtil.js');


/**
 * Import state handlers for the different skill states.
 * These handlers will be registered with Alexa using `registerHandlers`
 */
const startHandlers        = require('./handlers/startHandlers.js');
const rollCallHandlers     = require('./handlers/rollCallHandlers.js');
const rollCallExitHandlers = require('./handlers/rollCallExitHandlers.js');
const gameLoopHandlers     = require('./handlers/gamePlayHandlers.js');

/**
 * Main entry point for the skill.
 * This is the handler function that gets invoked when Alexa makes
 * a request to the skill.
 */
exports.handler = function(event, context, callback) {

    // top level interceptor to catch all responses and log them
    let mockContext = {
      succeed: function(result) {
        console.log("== RESPONSE ==" + JSON.stringify(result, null, 2) + "\r\n");
        return context.done(null, result);
      },
      fail: function(err) {
        return context.done(err, null);
      },
      done: function(err, result) {
        console.log("== RESPONSE == " + JSON.stringify(result, null, 2) + "\r\n");
        return context.done(err, result);
      }
    };

    // Prints Alexa Event Request to CloudWatch logs for easier debugging
    console.log("===EVENT=== \n" + JSON.stringify(event));

    const alexa = Alexa.handler(event, mockContext);
    alexa.appId = settings.APP_ID;

    // per-user persistence across session, configurable in config/settings.js
    alexa.dynamoDBTableName = settings.STORAGE.SESSION_TABLE;
    if (settings.STORAGE.SESSION_TABLE && settings.STORAGE.SESSION_TABLE !== '') {
        alexa.saveBeforeResponse = true; 
    }
    
    /* we are hooking into the .bind() function in order to save a copy of the
       bound object to each object that bind is called on. this was, we can use
       the original context, make changes to it, and re-assign it */ 
    var _bind = Function.prototype.apply.bind(Function.prototype.bind);
    Object.defineProperty(Function.prototype, 'bind', {
        value: function(obj) {
            var boundFunction = _bind(this, arguments);
            boundFunction.boundObject = obj;
            return boundFunction;
        }
    });

    // register a handler for each logical state of the skill 
    alexa.registerHandlers(globalHandlers,
                           startHandlers, 
                           rollCallHandlers, 
                           rollCallExitHandlers,
                           gameLoopHandlers);
    
    /* Bind the display.render helper function to each of  the Alexa handler objects
       to make it easy to use from any handler, by preserving the Alexa handler context */
    Object.keys(alexa._events).forEach(function (eventName) {
        if (eventName.substring(0, 1) != ':' && alexa._events[eventName].boundObject) {
            let boundObj = alexa._events[eventName].boundObject;
            Object.defineProperty(boundObj, 'display', {
                value: DisplayUtil.render.bind(boundObj),
                writable: true,
                configurable: true
            });
            Object.defineProperty(boundObj, 'getUIPrompts', {
                value: UI.prompts.bind(boundObj),
                writable: true,
                configurable: true
            });            
            alexa._events[eventName].bind(boundObj);         
        }   
    });

    /* Finally - execute the logic provided by the Alexa SDK for Node.js */
    alexa.execute();
};


const globalHandlers = {
    /**
     *  This global handler can be used to handle any request that otherwise 
     *  does not have a specific handler. All 'Unhandled_' requests should be routed to this handler.
     */
    'GlobalDefaultHandler': function() {        
        /*  
         *   Control logging settings in config/settings.js
         *   To print DEBUG messages, include the string 'DEBUG' in the settings.LOG_LEVEL array
         */
        logger.log('DEBUG', 'GlobalDefaultHandler');

        if (this.event.request.type === 'System.ExceptionEncountered') {
            /*
             * there is not much we can do if an error occurs
             * see:  https://developer.amazon.com/docs/alexa-voice-service/system.html#exceptionencountered
             */ 
            logger.log('ERROR', JSON.stringify(this.event.request.error));
        } else {            
            /* 
             *   Control TTS and Display prompts by modifying dialog/uiprompts.js
             *   The this.getUIPrompts function takes the following parameters:
             *       key - a label that identifies the prompts to retrieve
             *                note: this can also be used just as a tag to fetch specific dialog
             *       suffix - Any parameterized dialog you want to attach to the response
             */
            let {outputSpeech, reprompt} = this.getUIPrompts({
                key: 'UNHANDLED_REQUEST'
            });

            this.response.speak(outputSpeech).listen(reprompt);

            this.emit('GlobalResponseReady', { 'openMicrophone': true });
        }
    },

    /**
     *  This global handler represents the final stage in all requests.
     *  It takes a parameter that determines the microphone behavior.
     */
    'GlobalResponseReady': function({
        openMicrophone = false,
        endSession = false,
        resetGame = false
    } = {}) {
        if (endSession) {
            this.emit('GlobalSessionEndedRequestHandler', { openMicrophone, endSession, resetGame });
            return;
        }
        /*  
         *   Control logging settings in config/settings.js
         *   To print DEBUG messages, include the string 'DEBUG' in the settings.LOG_LEVEL array
         */
        logger.log('DEBUG', 'GlobalResponseReady (openMicrophone = ' + openMicrophone + ')');
        
        // we trigger the `GlobalResponseReady` event from other handlers 
        // the openMicrophone parameter controls the microphone behavior
        if (openMicrophone) {
            // setting shouldEndSession = false  
            //   lets Alexa know that we're looking for an answer from the user 
            // see: https://developer.amazon.com/docs/gadget-skills/receive-voice-input.html#open
            //      https://developer.amazon.com/docs/gadget-skills/keep-session-open.html
            this.handler.response.response.shouldEndSession = false;
        } else {
            // deleting shouldEndSession will keep the skill session going, 
            //   while the input handler is active, waiting for button presses
            // see: https://developer.amazon.com/docs/gadget-skills/keep-session-open.html
            delete this.handler.response.response.shouldEndSession;
        }
        
        this.emit(':responseReady');
    },

    'GlobalSessionEndedRequestHandler': function({ 
        resetGame = false 
    } = {}) {
        /*  
         *   Control logging settings in config/settings.js
         *   To print DEBUG messages, include the string 'DEBUG' in the settings.LOG_LEVEL array
         */
        logger.log('DEBUG', 'GlobalSessionEndedRequestHandler (resetGame = ' + resetGame + ')');
        
        // clean up attributes    
        delete this.attributes.STATE;
        delete this.attributes.resume;
        delete this.attributes.expectingEndSkillConfirmation;
        if (resetGame) {
            delete this.attributes.answeringButton;
            delete this.attributes.answeringPlayer;
            delete this.attributes.currentQuestion;
            delete this.attributes.correct;
            delete this.attributes.scores;
            delete this.attributes.buttons;
            delete this.attributes.buttonCount;
            delete this.attributes.playerCount;
        }
        
        // setting shouldEndSession = false  -  lets Alexa know that the skill is done
        // see: https://developer.amazon.com/docs/gadget-skills/receive-voice-input.html
        this.handler.response.response.shouldEndSession = true;
        this.handler.state = '';
                
        this.emit(':responseReady');
    }
};