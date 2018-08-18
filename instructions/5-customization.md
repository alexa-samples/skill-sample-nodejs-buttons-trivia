#  Build An Alexa 'Better with Buttons' Trivia Game
<img src="https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/quiz-game/header._TTH_.png" />

[![Voice User Interface](https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/navigation/1-locked._TTH_.png)](./1-voice-user-interface.md)[![Lambda Function](https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/navigation/2-locked._TTH_.png)](./2-lambda-function.md)[![Connect VUI to Code](https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/navigation/3-locked._TTH_.png)](./3-connect-vui-to-code.md)[![Testing](https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/navigation/4-locked._TTH_.png)](./4-testing.md)[![Customization](https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/navigation/5-on._TTH_.png)](./5-customization.md)[![Publication](https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/navigation/6-off._TTH_.png)](./6-publication.md)

## Customize the Game to be Yours

At this point, you should have a working copy of our Trivia skill.  In order to make it your own, you will need to customize it with data and responses that you create.  Here are the things you will need to change:

1.  **New questions**. You will need to provide a set of trivia for your topic.  We recommend a minimum of 25, but a total closer to 100 offers a better experience.

    1.  **Open /lambda/custom/config/questions.js.** You can use a simple, lightweight code editor like [Atom](http://atom.io), [Sublime Text](http://sublimetext.com), or [VSCode](http://code.visualstudio.com)

    2.  This file has a fairly simple format. There is a question **index**, the **question** itself, a list of possible **answers**, and the **correct_answer**. Simply replace the text with your new questions and answers. To add more just copy existing blocks and append to the end. Make sure each block ends with a comma. Also make sure each new question gets a new unique **index**. This is how questions are looked up with the questions are randomized.

2.  **New Voice Responses**. There are several voice prompts and responses that you will want to customize for your skill.

    1.  Open **/lambda/custom/config/messages.js.**

    2.  Replace **GAME_TITLE**. This is the name of your game and it is used in many of the other responses so make sure you do this first.

    3.  Continue through **messages.js** until you reach the bottom of the file.  This will ensure that you cover each of the values that you need or want to update.

3.  **Additional languages**. If you are creating this skill for multiple languages, you will need to make sure Alexa's responses are also in that language.

    1. Both **/lambda/custom/config/messages.js** and **/lambda/custom/config/questions.js** have sections to override for **en-GB**. To add additional languages simply follow the existing format to add them based on the locale code.

    2.  For example, if you are creating your skill in German, every single response that Alexa makes has to be in German.  You can't use English responses or your skill will fail certification.

4. **Game Options** including **Sounds** and **Button Animations**

    1. Open **/lambda/custom/config/settings.js.**

    2. You will find a variety of easily modified settings in this file, each well documented. Some particularily interesting ones might be:
      * **GAME_OPTIONS** - Here you can change things like the number of players allowed, the number of questions to ask, and if the questions should be asked in order or should be randomized at the beginning of the game.
      * **COLORS** - You can change the colors used for the animations easily here in variables like **QUESTION_COLOR** and **BUZZ_IN_COLOR**.
      * **GAME_ANIMATIONS** - If you're feeling more adventerous you can play with the timings of the animations in this section. Details on how to build animations can be found [here](https://developer.amazon.com/docs/gadget-skills/echo-button-animations.html).
      * **AUDIO** - This has links to the audio files used in the game. If you change these note that they need to be server over a SSL connection from the web - they cannot be local to the Lambda.

5.  Once you have made the updates you would like you will need to redeploy your code by creating and uploading a new zip file as detailed in [Step 2](./2-lambda-function.md).

6. Once things are deployed you can return to the Developer Console and click **Next** to move on to Publishing and Certification of your skill.

[![Next](https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/general/buttons/button_next_publication._TTH_.png)](6-publication.md)
