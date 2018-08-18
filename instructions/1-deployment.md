![](https://images-na.ssl-images-amazon.com/images/G/01/kindle/dp/2017/4911315144/LP_AG_HERO_BANNER_1334x389.jpg)


# Echo Button Game Template

**Important: The Gadgets Skill API is in beta and is subject to change at any time without notice. We welcome your feedback.**

These instructions show how to create a game skill which demonstrates the core functionality of an Echo Button game. It covers:
* The requirement for [roll call](https://developer.amazon.com/docs/gadget-skills/discover-echo-buttons.html#goals)
* Starting and stopping the [Input Handler](https://developer.amazon.com/docs/gadget-skills/receive-echo-button-events.html#flow) to receive Echo Button events to your skill's Lambda function
* [Defining animations](https://developer.amazon.com/docs/gadget-skills/control-echo-buttons.html#animate) for different button events. 
* Show how Echo Buttons can interrupt text-to-speech (TTS).
* Common game play patterns and effects like signaling when it is time to answer, when a player's answer is right or wrong, and distinct animations and sounds to let the players know that roll call is complete.


This sample skill uses:

* The <a href="https://developer.amazon.com/alexa/console/ask" target="_blank">Alexa Skills Kit developer console</a> to configure the skill and specify the interaction model
* The [node.js](https://nodejs.org/) framework for the skill code
* [AWS Lambda](https://aws.amazon.com/lambda) to host the skill
* [Amazon DynamoDB](https://aws.amazon.com/dynamodb) to save a state table (Optional)
* The [Alexa Skills Kit (ASK) SDK for Node.js](https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs) to simplify the skill code
* An animation library to create simple animations such as fade out and breathe, as shown in [Animations](https://developer.amazon.com/docs/gadget-skills/echo-button-animation-library.html#animations). 
* A fully configurable [settings file](lambda/custom/config/settings.js) to customize your game without having to write code. For more information, see [How to configure your game using the settings file](#how-to-configure-your-game-skill)
* A list of [questions and answers](lambda/custom/config/questions.js) you can modify to create your own game without modifying the game code. Note* this will require you to update slot values in your skill's language model in the Amazon developer portal. For more information see section on [adding your own questions](#changing-the-questions-and-answers)


## Table of Contents
* [Skill Behavior](#skill-behavior)
* [Before you get started](#before-you-get-started)
* [Get the skill running in your account](#get-the-skill-running-in-your-own-account)
    * [Step 1 - Create the function in AWS Lambda](#step-1---create-the-function-in-aws-lambda)
    * [Step 2 - Find the ARN of the Lambda function](#step-2---find-the-arn-of-the-lambda-function)
    * [Step 3 - Create the Skill](#step-3---create-the-skill)
    * [Step 4 - Create an Interaction Model](#step-4---create-an-interaction-model)
    * [Step 5 - Select Gadget Interfaces](#step-5---select-gadget-interfaces)
    * [Step 6 - Enter the Endpoint](#step-6---enter-the-endpoint)
    * [Step 7 - Enter Publishing Information](#step-7---enter-publishing-information)
    * [Step 8 - Enter Privacy and Compliance Information](#step-8---enter-privacy-and-compliance-information)
    * [Step 9 - Enable the Skill in the Alexa App](#step-9---enable-the-skill-in-the-alexa-app)
    * [Step 10 - Invoke the Skill](#step-10---invoke-the-skill)



# Skill Behavior

When the Echo Buttons Game Template skill begins, Alexa will ask you to press the Echo Buttons that you want to use. This is called [roll call](https://developer.amazon.com/docs/gadget-skills/discover-echo-buttons.html#goals). 

This template supports 2 modes of roll call, which you can control using the value of ROLLCALL in the [settings file](lambda/custom/config/settings.js). Either set the value to QUICK_START = true or NAMED_PLAYERS = true to affect the behavior.

In both cases, Alexa will begin by asking how many players are playing the game, which expects a numeric response from two to four. in QUICK_START mode, the skill will wait for 4 distinct button presses before completing roll call and sending an audio response and animation to let players know all of the buttons have been registered.
In NAMED_PLAYERS mode, the skill will respond after each button press and let the players know which player number they are, such as "Hello, Player #' where the number value is in order of pressing the buttons. Similar to the QUICK_START mode, once all players are registered, the skill will send an audio response and animation to let the players know that roll call is complete.


# Before you get started
Before you create your own Echo Buttons Game Template skill, you must take the following steps:

* **Create an Amazon developer account** – If you don't already have an Amazon developer account, go to the [developer portal](https://developer.amazon.com/alexa/console/ask) and select **Sign In** in the upper right to create a free account.
* **Sign up for AWS** – If you haven't already, sign up for AWS by going to [AWS Free Tier](https://aws.amazon.com/free). For most developers, the [AWS Lambda Free Tier](https://aws.amazon.com/lambda/pricing/) and [Amazon DynamoDB Free Tier](https://aws.amazon.com/dynamodb/pricing/) are sufficient for the function that supports an Alexa skill.
* **Get Echo Buttons** – This skill requires two to four [Echo Buttons](https://www.amazon.com/Echo-Buttons-Alexa-Gadget-Pack/dp/B072C4KCQH). 

# Get the skill running in your own account

## Step 1 - Create the function in AWS Lambda
In this step, you will create the Lambda function that will be used by your skill. Later, when you set up the skill in the developer portal, you will specify that this function is the endpoint for the skill.

### Create a role for your function
1. Sign in to the [AWS Management Console](https://console.aws.amazon.com/console/home) 
2. Navigate to the [IAM Service console](https://console.aws.amazon.com/iam/home), which is located under **Compute** services.
3. Click **Roles** on the left side bar and then click **Create role**
4. Leave the **AWS Service** box selected and click **Lambda** from the list of services and click **Next: Permissions**
5. In the search box, search for **Lambda** and click the checkbox next to the policy named **AWSLambdaExecute** and click the checkbox to the left of the name
6. Repeat for the **AmazonDynamoDBFullAccess** and **CloudWatchLogsFullAccess** policies. Finally click the **Next: Review** button
7. On the next screen, give the role a name like **echo-button-lambda-role** and click the **Create Role** button

### Create the Lambda function

1. Sign in to the [AWS Management Console](https://console.aws.amazon.com/console/home) 
2. Navigate to the [AWS Lambda console](https://console.aws.amazon.com/lambda/home), which is located under **Compute** services.
3. Select **Create function**.
4. Make sure that you are on the **Author from scratch** page.
5. For **Name**, enter **EchoButtonsGameTemplate**.
6. For **Runtime**, select **Node.js 6.10**.
7. In the **Execution Role** heading, select **Choose an Existing Role**.
8. For **Existing Role**, select the role you just created.
9. In the lower right, click the **Create function** button. The function might take a moment to create.
10. Scroll down a bit. Under the **Function code** section, for **Code entry** type, select **Upload a .ZIP** file. Then click **Upload** and choose the zip file that you created in the first step.
11. For **Runtime**, select **Node.js 8.10**.
12. At the top of the page, under the **Designer** section, under **Add triggers**, select **Alexa Skills Kit**. 
13. At the bottom of the page, under **Configure Triggers**, select **Disable** for **Skill ID verification**.
14. At the bottom of the page, click **Add**.
15. At the top of the page, click **Save**.

## Step 2 - Find the ARN of the Lambda function
In this step, you find the Amazon Resource Name (ARN) of the Lambda function that you just created. The ARN serves as the ID of the function. You can find the ARN at the top right of the EchoButtonsGameTemplate function page in the AWS Lambda console. The ARN will look something like `arn:aws:lambda:us-east-1:<your AWS account ID>:function:EchoButtonsGameTemplate`.

Copy the ARN. Later, when you set up the Echo Buttons Game Template skill in the developer portal, you will provide this ARN as the endpoint for the skill.

## Step 3 - Create the Skill 

Next, create the skill in the developer console by using the following steps:

1. Sign in to the <a href="https://developer.amazon.com/alexa/console/ask" target="_blank">Alexa Skills Kit developer console</a>. 
2. Select **Create Skill**.
3. For **Skill Name**, enter **Echo Buttons Game Template**, and then select **Next** in the upper right.
4. For **Choose a model to add to your skill**, select **Custom**, and then select **Create Skill** in the upper right.

## Step 4 - Create an Interaction Model 

### Using the ASK-CLI
If you would prefer to use the command-line tools to upload your skill's language model, please see our documentation on using the [ask-cli](https://developer.amazon.com/docs/smapi/ask-cli-intro.html). This skill's folder structure is compliant with the cli requirements.

## Using the developer portal

Continuing from the previous step, do the following:
1. On the left side, select **Invocation**.
2. For **Skill Invocation Name**, enter `animal button trivia` (or a custom invocation name of your choosing, and then select **Save Model**.
3. Add built-in intents for AMAZON.YesIntent, AMAZON.NoIntent, AMAZON.CancelIntent, AMAZON.StopIntent, AMAZON.HelpIntent:
    1. On the left side, select **Intents**.
    2. Select **Add Intent**.
    3. Select **Use an existing intent from Alexa's built-in library**.
    4. In the search box, type `yes`. The search results should come up with `AMAZON.YesIntent`.
    5. Next to `AMAZON.YesIntent`, select **Add Intent**.
    6. Using a similar procedure, add `AMAZON.NoIntent`
    7. At the top of the page, select **Save Model**.
4. You will now create slots for a custom intent. (You will create the custom intent in the next step.) Think of a slot as a variable that your intents can use. In this skill, we need to define 2 slots, `answers` and `players` to handle answers to questions and the number of players respectively:
    1. On the left, select **Slot Types**.
    2. Select **Add Slot Type**.
    3. Under **Create custom slot type**, type `answers`, and then select **Create custom slot type**. 
    4. Under **Slot Values**, enter the following list (one at a time):
        ``` 
            fox
            wolf
            cat
            dog
            caribou
            polar bear
            narwhal
            penguin
            orangutan
            elephant
            dolphin
            blue whale
            janet
            jenny
            joey
            adder
            copperhead
            coral snake
            cobra
            mammals
            reptiles
            black with white stripes
            white with black stripes
            shell
            fish
            arachnid
            crustacean
            squirrels
            echidnas
            dolphins
            spiny anteaters
            frat
            den
            pride
            pack
        ```
    5. On the left, select **Slot Types**.
    6. At the top of the page, select **Save Model**.
5. Next, you will need to add the first of three intents. To create the `AnswerQuestionIntent` intent:
    1. On the left side, select **Intents**.
    2. Select **Add Intent**.
    3. Under **Create custom intent**, enter `AnswerQuestionIntent`, and then select **Create custom intent**.
    4. Scroll down to the **Intent Slots** section of the page.
    5. For **NAME**, enter `answers` and then, to the right of the name, select the **+** sign.  
    6. For the slot you just created, select **SLOT TYPE** and then select **answers**, which is a slot type that you created in a previous step.
    7. Scroll up to **Sample Utterances**.
    8. In the **Sample Utterances** field, enter `{` (that is, a left brace), select **answers**, and then select the **+** sign.
    9. In the **Sample Utterances** field, enter `is it {`, select **answers**, and then select the **+** sign.
    10. In the **Sample Utterances** field, enter `it is {`, select **answers**, and then select the **+** sign.
    11. In the **Sample Utterances** field, enter `The answer is {`, select **answers**, and then select the **+** sign.   
    12. On the left side, select **Intents**.   
    13. At the top of the page, select **Save Model**.
    14. Select **Build Model**. The model might take a moment to build.
6. Next, add the `PlayerCount` intent
    1. On the left side, select **Intents**.
    2. Select **Add Intent**.
    3. Under **Create custom intent**, enter `PlayerCount`, and then select **Create custom intent**.
    4. Scroll down to the **Intent Slots** section of the page.
    5. For **NAME**, enter `players` and then, to the right of the name, select the **+** sign.  
    6. For the slot you just created, select **SLOT TYPE** and then select **AMAZON.NUMBER**
    7. In the *             *Sample Utterances** field, enter `{players}`, select **answers**, and hit enter.
    8. In the **Sample Utterances** field, enter `about {player} players`, select **answers**, and hit enter.
    9. In the **Sample Utterances** field, enter `there are {players} of us`, select **answers**, and hit enter.
    10. In the **Sample Utterances** field, enter `there are {players} players`, select **answers**, and hit enter.   
    11. On the left side, select **Intents**.   
    12. At the top of the page, select **Save Model** and the **Build Model**. The model might take a moment to build.
7. Finally add the `PlayGame' intent
    1. On the left side, select **Intents**.
    2. Select **Add Intent**.
    3. Under **Create custom intent**, enter `PlayGame`, and then select **Create custom intent**.
    5. In the **Sample Utterances** field, enter `start playing`,and hit enter.
    6. In the **Sample Utterances** field, enter `start a game`, and hit enter.
    7. In the **Sample Utterances** field, enter `play`, and hit enter.   
    8. In the **Sample Utterances** field, enter `let's play`, and hit enter. 
    9. On the left side, select **Intents**.   
    10. At the top of the page, select **Save Model**.
    11. Select **Build Model**. The model might take a moment to build.

## Step 5 - Select Interfaces

Continuing from the previous step, do the following:

1. On the left side, select **Interfaces**.
3. From the interface list, select and enable the **Display** interface
2. In the **Alexa Gadget** row of the interface list, select **Gadget Controller** and **Game Engine**.
3. At the top of the page, select **Save Interfaces**.

## Step 6 - Enter the Endpoint

Continuing from the previous step, do the following:

1. On the left side, select **Endpoint**.
2. For **Service Endpoint Type**, select **AWS Lambda ARN**. 
3. In the **Default Region** field, paste the ARN of the Lambda function that you created in an earlier step. Leave the other options at their default values.
4. At the top of the page, select **Save Endpoints**.

## Step 7 - Enter Publishing Information

Continuing from the previous step, do the following:

1. At the top of the page, select **Launch**.
2. For **One Sentence Description** and **Detailed Description**, enter `This is a sample skill for Echo Buttons.`
3. For **Example Phrases**, enter `Alexa, open animal button trivia`. 
4. For **Echo Button Use**, select **Required**.
5. For **Number of Echo Buttons**, select a **Min** of **2** and a **Max** of **4**.
6. For **Number of Players**, select **2** for **Min** and **4** for **Max**.  
7. Skip the icon part for now.
8. For **Category**, select **Games**.
9. At the bottom of the page, select **Save and continue**.

## Step 8 - Enter Privacy and Compliance Information

Continuing from the previous step, do the following:

1. For **Does this skill allow users to make purchases or spend real money?**, select **No**.
2. For **Does this Alexa skill collect users' personal information?**, select **No**.
3. For **Is this skill directed to or does it target children under the age of 13?**, select **No**.
4. For **Does this skill contain advertising?** select **No**.
5. For **Export Compliance**, select the checkbox.
6. For **Testing Instructions**, enter `None`.
7. At the bottom of the page, select **Save and continue**.
8. Again, select **Save and continue**. This will accept the default options on the **Availability** page. 

   You should now be on the **Submission** page, which will tell you that fixes are required (to add icons). You don't need to add icons now because you can test the skill without submitting it for certification.

## Step 9 - Enable the Skill in the Alexa App
Your Echo Button Game Template skill is in the development state and available for you to test with your Amazon Echo device and your Echo Buttons. First, you must ensure that the skill is enabled in the Alexa app. To check this, do the following:

1. Go to the web version of the Alexa app ([alexa.amazon.com](https://alexa.amazon.com/)) and sign in with your Amazon developer account.
2. Choose **Skills** from the main menu.
3. In the upper right, choose **Your Skills**.
4. Using the search bar, search for the Echo Button Game Template skill. 
5. Select the skill. If the skill is already enabled, the button next to the skill name says **DISABLE SKILL**. In that case, you are finished with this step. If the button says **ENABLE**, then select that button.

## Step 10 - Create the deployment package and upload to Lambda
1. Clone or download the [skill-sample-nodejs-buttons-game-templates](https://github.com/alexa/skill-sample-nodejs-buttons-game-templates) GitHub repository.
2. Modify the APP_ID value in the [settings file](lambda/custom/config/settings.js) for your skill by replacing `<YOUR SKILL ID>` with the value of for your skill. Make sure to save this file.
3. From the command line, navigate to the lambda/custom folder and run 
    ```
    npm install
    ```
    to install all of the necessary dependencies.
3. Zip up all of the files that are in the **skill-sample-nodejs-buttons-game-templates/lambda/custom** folder. This zip file will be your deployment package. Be sure to only zip the files and folders that are *inside* the **skill-sample-nodejs-buttons-game-templates/lambda/custom** folder, not the **skill-sample-nodejs-buttons-game-templates/lambda/custom** folder itself. AWS Lambda must be able to find the **index.js** file at the root of the zip file. 
4. Sign in to (or return to) the [AWS Management Console](https://console.aws.amazon.com/console/home) 
5. Navigate to the [AWS Lambda console](https://console.aws.amazon.com/lambda/home)
6. In the **Function Code** section, select **Upload a .ZIP file** from the drop-down menu
7. Click the **Upload** button and find the zip file you just created.
8. Click **Save** in the top right corner.

## Step 11 - Invoke the Skill
Pair your Echo Buttons to your Amazon Echo device, and then invoke the skill by saying "***Alexa, open animal button trivia***". 

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

## License

This sample is licensed under the Amazon Software License.
