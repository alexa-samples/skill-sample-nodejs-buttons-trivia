![](https://images-na.ssl-images-amazon.com/images/G/01/kindle/dp/2017/4911315144/LP_AG_HERO_BANNER_1334x389.jpg)


# Echo Button Game Template

**Important: The Gadgets Skill API is in beta and is subject to change at any time without notice. We welcome your feedback.**

These instructions show how to customize the Trivia Template skill.

# How to configure your game skill

## Introduction
This Echo Button Game Template provides a way for you to customize your skill without necessarily writing code. You can affect the following features through configuration only:
* Roll Call Behavior
* Questions and Answers.
* Total number of questions to be asked per game
* Total number of questions asked/answered before a score summary is shared with the players
* Button colors to indicate 
    * Answer/buzz-in readiness
    * First to buzz-in
    * Missed buzz-in
    * Correct answers
    * Incorrect answers
* Sound effects, including:
    * When roll call is complete
    * When the skill is waiting for buttons to be pressed after asking a question
    * When a user presses their button
    * When a user's answer is correct
    * When a user's answer is incorrect.
* Changing the background, correct and incorrect images on Echo Show and Echo Spot devices
* Changing the maximum number of players
* Changing the acceptable answer threshold

## Changing the roll call behavior
You can change the [roll call](https://developer.amazon.com/docs/gadget-skills/discover-echo-buttons.html#goals) behavior for the template by changing `ROLL_CALL` value in the [settings file](lambda/custom/config/settings.js)
```
/**
* ROLLCALL - Control how players register themselves for the game
*      QUICK_START
*          Allows for all buttons up to GAME.MAX_PLAYERS to press their buttons during 
*          roll call before the skill will decide they are registered
*      NAMED_PLAYERS
*          On each button press up to GAME.MAX_PLAYERS, acknowledge the button press
*          and call the player out by name
*/
ROLLCALL : {
    QUICK_START : true,
    NAMED_PLAYERS: false
}
```
### `QUICK_START` mode
When setting `QUICK_START` to `true`, this means the skill will allow all buttons up to [MAX_PLAYERS](#changing-the-maximum-number-of-players) to be pressed before acknowledging that all players are registered and continuing with the game

### `NAMED_PLAYERS` mode
When setting `NAMED_PLAYERS` to `true`, Alexa will acknowledge each player when they press their button during [roll call](https://developer.amazon.com/docs/gadget-skills/discover-echo-buttons.html#goals) by saying 'Hello, player #' where # is a value between 1 and [MAX_PLAYERS](#changing-the-maximum-number-of-players)

## Changing the questions and answers
This sample comes with a list of 10 default animal based questions located in [questions.js](lambda/custom/config/questions.js) which you can modify to your liking. 
```
{
    index: 1,
    question: 'What is the name for a group of lions?',
    answers: ['pack', 'pride', 'den', 'frat'],
    correct_answer: 'pride'
}
```

The question objects in the array have the following properties per question:
* `index` - The ordinal position of the question in the list. Questions will be fetched per this numbering.
* `question` - The question to be asked.
* `answers` - The list of answer options to read to the user.
* `correct_answer` - The correct answer for the question.

### Interaction Model Dependencies 
You must add any new values in the `answers` array to the `{answers}` slot in your Alexa skill's interaction model. See the section on building the [interaction model](#step-4-create-an-interaction-model) for instructions on how to do that.


## Changing the button colors
You can also adjust the button colors show to the users for the different button events and states in the game.
In general, you want to use visual cueing in the form of button colors to indicate different states and readiness for your game.
```
COLORS : {
        // Color you want the buttons to be when expecting input
        QUESTION_COLOR: 'purple',
        // Color you want the first button to chime in to be
        BUZZ_IN_COLOR: 'blue',
        // Color you want the other buttons who didn't chime in
        MISSED_BUZZ_IN: 'black',
        // Incorrect answer color
        INCORRECT_COLOR: 'red',
        // Correct color
        CORRECT_COLOR: 'green'
    }
```
You can affect the the above list by changing the string value for the color. However, you must make sure the string and its corresponding hex value are present in [colorsList.js](lambda/custom/button_animations/colorsList.js) and if not, you will need to add a mapping of the color's string value, for example `fuschia` to its hex value `FF00FF` to the array of colors in the [colorsList.js](lambda/custom/button_animations/colorsList.js) file.
```
{
    "value":"FF00FF",
    "name":"fuschia"
}
```
## Changing the sounds
You can change the sounds in the game by changing the value for the `<audio src=` value in the [settings file](lambda/custom/config/settings.js) for the different conditions. The current sounds are sourced from the Alexa Skills Kit [Sound Library](https://developer.amazon.com/docs/custom-skills/ask-soundlibrary.html). If you are going to use your own custom audio effects, please make sure they meet [Alexa's SSML requirements](https://developer.amazon.com/docs/custom-skills/speech-synthesis-markup-language-ssml-reference.html#audio) 

```
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
    AUDIO :{
        ROLL_CALL_COMPLETE: "<audio src='https://s3.amazonaws.com/alexa-ml/sounds/sound-library/Beeps_and_Bloops/Intro_2.mp3'/>",
        WAITING_FOR_BUZZ_IN_AUDIO: "<audio src='https://s3.amazonaws.com/ask-soundlibrary/foley/amzn_sfx_rhythmic_ticking_30s_01.mp3'/>",
        BUZZ_IN_AUDIO : "<audio src='https://s3.amazonaws.com/alexa-ml/sounds/sound-library/Beeps_and_Bloops/Bell_2.mp3'/>",
        CORRECT_ANSWER_AUDIO : "<audio src='https://s3.amazonaws.com/alexa-ml/sounds/sound-library/Crowds/Cheer_4.mp3'/>",
        INCORRECT_ANSWER_AUDIO : "<audio src='https://s3.amazonaws.com/alexa-ml/sounds/sound-library/Crowds/Crowd_Boo_1.mp3'/>"
    }
```
## Changing the screens for Echo Show and Echo Spot
This skill also supports the Echo devices with screens, the Echo Show and the Echo Spot.
To change the available selection you can replace or add to the list of images in any given condition's array of values.
There are multiple images per condition to provide some variability to your players so they aren't always seeing the same
screens. The logic that selects a particular image can be found in the [displayUtil](lambda/custom/utils/displayUtil.js) file.
It effectively selects a random image in this list each time it is called.

If you are replacing or adding to this list, please make sure the images meet Alexa's [display interface](https://developer.amazon.com/docs/custom-skills/display-interface-reference.html#image-size-and-format-allowed-by-display-templates) requirements

```
 IMAGES :{
        BACKGROUND_IMAGES : [
            'https://s3.amazonaws.com/echo-buttons-template/bg1.jpg',
            'https://s3.amazonaws.com/echo-buttons-template/bg2.png'
        ],
        CORRECT_ANSWER_IMAGES : [
            'https://s3.amazonaws.com/echo-buttons-template/correct1.png',
            'https://s3.amazonaws.com/echo-buttons-template/correct2.png',
            'https://s3.amazonaws.com/echo-buttons-template/correct3.png',
            'https://s3.amazonaws.com/echo-buttons-template/correct4.png'
        ],
        INCORRECT_ANSWER_IMAGES : [
            'https://s3.amazonaws.com/echo-buttons-template/wrong1.png',
            'https://s3.amazonaws.com/echo-buttons-template/wrong1.png',
            'https://s3.amazonaws.com/echo-buttons-template/wrong1.png',
        ]
    }
```

## Changing the maximum number of players
You can also affect the maximum number of players by changing the value for `GAME.MAX_PLAYERS`
```
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
     */
    GAME : {
        MAX_PLAYERS: 4,
        QUESTIONS: 10,
        QUESTIONS_PER_ROUND: 5,
        ANSWER_SIMILARITY: .60
    }
```
## Changing the number of rounds per game
You can also affect how many questions Alexa will ask before giving a summary of the scores by changing the value of `GAME.QUESTIONS_PER_ROUND`.
This value **MUST** satisfy the equation `GAME.QUESTIONS_PER_GAME` % `GAME.QUESTIONS_PER_ROUND` = 0 (i.e. it should divide evenly into the total number of questions)
```
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
     */
    GAME : {
        MAX_PLAYERS: 4,
        QUESTIONS: 10,
        QUESTIONS_PER_ROUND: 5,
        ANSWER_SIMILARITY: .60
    }
```
## Changing the acceptable answer threshold
Alexa will always pass what the user said to the skill, whether or not it is a member of the `{answers}` slot. In this regard, direct string matching of answers to correct answers is never a good idea. This example, and a best practice when comparing spoken user input passed in a slot value to expected results, is to use a [string-similarity](https://www.npmjs.com/package/string-similarity) algorithm to compute how similar the strings are.
The fractional (or percentage) value for `GAME.ANSWER_SIMILARITY` is a minimum threshold to allow the passed-in slot value to match the value of `correct_answer` in the [questions](lambda/custom/config/questions.js). For example, at the default setting the spoken answer must be at least 60% similar to the correct answer to be considered a correct response.
```
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
     */
    GAME : {
        MAX_PLAYERS: 4,
        QUESTIONS: 10,
        QUESTIONS_PER_ROUND: 5,
        ANSWER_SIMILARITY: .60
    }
```


## License

This content is licensed under the Amazon Software License.