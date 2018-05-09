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
const settings          = require('../config/settings.js');
const Alexa             = require('alexa-sdk');
const makePlainText     = Alexa.utils.TextUtils.makePlainText;
const makeImage         = Alexa.utils.ImageUtils.makeImage;
const logger            = require('../utils/logger.js');

module.exports = {
    'render': function({
        /* the title to be displayed on devices with large screens */
        displayTitle,
        /* primary text content to display - either a string, or a text object */
        displayText,
        /* (optional) secondary text content to display - either a string, or a text object */
        displaySubText,
         /* a background image to be displayed under the text content */
        backgroundImage, 
        /* (optional) an image to be displayed on the side of the text content */
        image
    } = {}) {

        if (!this.event.context.System.device.supportedInterfaces.Display) {
            // if there is no support for the Display interface, simply return
            return;
        }
                
        let pText = (typeof displayText === 'string' || displayText instanceof String)
                  ? makePlainText(displayText) : displayText;
        let sText = (typeof displaySubText === 'string' || displaySubText instanceof String)
                  ? makePlainText(displaySubText) : displaySubText;
        
        if (!pText) {
            logger.log('WARN', 'Render template without primary text!');
        }
        pText = pText || makePlainText('');

        let background = backgroundImage || settings.pickRandom(settings.IMAGES.BACKGROUND_IMAGES);
    
        const builder = (image ? new Alexa.templateBuilders.BodyTemplate3Builder()
                               : new Alexa.templateBuilders.BodyTemplate1Builder())
                .setTitle(displayTitle)
                .setBackgroundImage(makeImage(background))
                .setTextContent(pText, sText);    
        
        if (image) {
            // if an 'image' was provided, use the BodyTemplate3 template
            builder.setImage(makeImage(image))
        }
    
        const template = builder.build();
        this.response.renderTemplate(template);
    }
};