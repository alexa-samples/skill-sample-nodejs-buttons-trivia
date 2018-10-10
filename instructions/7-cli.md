#  Build An Alexa 'Better with Buttons' Trivia Game
<img src="https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/quiz-game/header._TTH_.png" />

## Setup using the ASK CLI

### About
This readme assumes you have your developer environment ready to go and that you have some familiarity with CLI (Command Line Interface) Tools, [AWS](https://aws.amazon.com/), and the [ASK Developer Portal](https://developer.amazon.com/alexa). If not, [click here](./1-voice-user-interface.md) for a more detailed walkthrough.

### Pre-requisites

* Node.js (> v8)
* Register for an [AWS Account](https://aws.amazon.com/)
* Register for an [Amazon Developer Account](https://developer.amazon.com/alexa)
* Install and Setup [ASK CLI](https://developer.amazon.com/docs/smapi/quick-start-alexa-skills-kit-command-line-interface.html)

### Installation
1. **Make sure** you are running the latest version of the CLI

	```bash
	$ npm update -g ask-cli
	```

2. **Clone** the repository.

	```bash
	$ git clone https://github.com/alexa/skill-sample-nodejs-buttons-trivia/
	```

3. If it's your first time using it, **initiatialize** the [ASK CLI](https://developer.amazon.com/docs/smapi/quick-start-alexa-skills-kit-command-line-interface.html) by navigating into the repository and running npm command: `ask init`. Follow the prompts.

	```bash
	$ cd skill-sample-nodejs-trivia
	$ ask init
	```

4. Install npm dependencies by navigating into the `/lambda/custom` directory and running the npm command: `npm install --save`

	```bash
	$ cd lambda/custom
	$ npm install
	```

### Deployment

ASK CLI **will create the skill and the lambda function for you**. The Lambda function will be created in ```us-east-1 (Northern Virginia)``` by default.

1. Navigate to the project's root directory. you should see a file named 'skill.json' there.
2. Deploy the skill and the lambda function in one step by running the following command:

	```bash
	$ ask deploy
	```
	
##### Add DynamoDB permissions to the Lambda role

The ASK CLI automatically created a role for your lambda function to run under that can execute lambda functions and write to cloudwatch logs, but since we are using the [built-in persistence](https://ask-sdk-for-nodejs.readthedocs.io/en/latest/Managing-Attributes.html#persistent-attributes) of the [Alexa Skills Kit for NodeJS SDK](https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs/), we need to add a policy that will allow the role to create/read/write to DynamoDB

1. Sign in to the [AWS Management Console](https://console.aws.amazon.com/console/home)
2. Navigate to the [IAM Service console](https://console.aws.amazon.com/iam/home) which is located under **Security, Identity & Compliance**.
3. Click Roles on the left side bar and find the role created for you by the ASK CLI. The name should start with **ask-lambda-**. Click the role name to see the details.
4. On the Permissions tab, click the **Attach Policy** button
5. In the search box, search for **AmazonDynamoDBFullAccess**, select the policy by clicking the checkbox to the left, and click the **Attach Policy** button at the bottom of the page.

### Testing

1. To test, you need to login to Alexa Developer Console, and **enable the "Test" switch on your skill from the "Test" Tab**.

2. Simulate verbal interaction with your skill through the command line (this might take a few moments) using the following example:

	```bash
	 $ ask simulate -l en-GB -t "start better buttons trivia"

	 ✓ Simulation created for simulation id: 4a7a9ed8-94b2-40c0-b3bd-fb63d9887fa7
	◡ Waiting for simulation response{
	  "status": "SUCCESSFUL",
	  ...
	 ```

3. Once the "Test" switch is enabled, your skill can be tested on devices associated with the developer account as well. Speak to Alexa from any enabled device, from your browser at [echosim.io](https://echosim.io/welcome), or through your Amazon Mobile App and say :

	```text
	Alexa, start better buttons trivia
	```
## Customization

1. ```./skill.json```

   Change the skill name, example phrase, icons, testing instructions etc ...

   Remember than many of the details are locale-specific and must be changed for each locale (en-GB and en-US)

   See the Skill [Manifest Documentation](https://developer.amazon.com/docs/smapi/skill-manifest.html) for more information.

2. ```./lambda/custom/config/messages.js, ./lambda/custom/config/questions.js, ./lambda/custom/config/settings.js```

   Modify messages, questiosn, and settings from the source code to customize the skill. More information can be found in [Customizations](./5-customization.md)

3. ```./models/*.json```

	Change the model definition to replace the invocation name and the sample phrase for each intent.  Repeat the operation for each locale you are planning to support.

4. Remember to re-deploy your skill and lambda function for your changes to take effect.
