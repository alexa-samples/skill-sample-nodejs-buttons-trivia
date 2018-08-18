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
const Alexa = require('ask-sdk');
const settings = require('../config/settings.js');
const logger = require('../utils/logger.js');

const Display = {
  render: function (
    /* The Alexa request and attributes */
    handlerInput,
    {
      displayTitle,
      /* primary text content to display */
      displayText,
      /* (optional) secondary text content to display */
      displaySubText,
      /* a background image to be displayed under the text content */
      backgroundImage,
      /* (optional) an image to be displayed on the side of the text content */
      image
    } = {}) {

    let ctx = handlerInput.attributesManager.getRequestAttributes();

    /**
     * Check for display
     */
    if (!handlerInput.requestEnvelope.context.System.device.supportedInterfaces.Display) {
      logger.debug('No display to render.');
      return;
    }

    if (!displayText) {
      logger.warn('Render template without primary text!');
    }

    let text = displayText || '';
    if (Array.isArray(text)) {
      text = settings.pickRandom(text);
    }

    let subText = displaySubText || '';
    if (Array.isArray(subText)) {
      subText = settings.pickRandom(subText);
    }

    const background = backgroundImage || settings.pickRandom(settings.IMAGES.BACKGROUND_IMAGES);

    // Rich can handle plain as well
    const textContent = new Alexa.RichTextContentHelper()
      .withPrimaryText(text)
      .withSecondaryText(subText)
      .getTextContent();

    const renderBackground = new Alexa.ImageHelper()
      .addImageInstance(background)
      .getImage();

    if (image) {
      renderImage = new Alexa.ImageHelper()
        .addImageInstance(image)
        .getImage();
      ctx.renderTemplate = {
        type: 'BodyTemplate3',
        backButton: 'HIDDEN',
        backgroundImage: renderBackground,
        title: displayTitle,
        image: renderImage,
        textContent: textContent
      }
    } else {
      ctx.renderTemplate = {
        type: 'BodyTemplate1',
        backButton: 'HIDDEN',
        backgroundImage: renderBackground,
        title: displayTitle,
        textContent: textContent
      }
    }
  }
};
module.exports = Display;