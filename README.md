![](https://images-na.ssl-images-amazon.com/images/G/01/kindle/dp/2017/4911315144/LP_AG_HERO_BANNER_1334x389.jpg)


# Echo Buttons Trivia Game Template

**Important: The Gadgets Skill API is in beta and is subject to change at any time without notice. We welcome your feedback.**

* **[08/03/2018] Updated for [ASK SDK Version 2](https://developer.amazon.com/blogs/alexa/post/decb3931-2c81-497d-85e4-8fbb5ffb1114/now-available-version-2-of-the-ask-software-development-kit-for-node-js)**

This template offers a starting point for you to build your own Trivia Game skill featuring [Echo Buttons](https://www.amazon.com/Echo-Buttons-Alexa-Gadget-Pack/dp/B072C4KCQH).
The template implements [roll call](https://developer.amazon.com/docs/gadget-skills/discover-echo-buttons.html#goals) and a game loop that handles asking and answering trivia questions. It handles [receiving Echo Button events](https://developer.amazon.com/docs/gadget-skills/receive-echo-button-events.html) as well as [animating the Echo Buttons lights](https://developer.amazon.com/docs/gadget-skills/control-echo-buttons.html#animate).

**Note** You may use this template as a starting point to build your own trivia game skill.
You can customize the questions list and some game parameters without making any code changes although
in order to provide a unique game experience, you may have to make some code changes.

This sample skill uses:

* The [node.js](https://nodejs.org/) framework (>= v8.10) for the skill code
* The [Alexa Skills Kit (ASK) SDK for Node.js](https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs/tree/2.0.x) to simplify the skill code
* [AWS Lambda](https://aws.amazon.com/lambda) to host the skill
* [Amazon DynamoDB](https://aws.amazon.com/dynamodb) to save a state table (Optional)
* An animation library to create simple animations such as fade out and breathe, as shown in [Animations](https://developer.amazon.com/docs/gadget-skills/echo-button-animation-library.html#animations).
* A fully configurable [settings file](lambda/custom/config/settings.js) to customize your game without having to write code. <!--For more information, see [How to configure your game using the settings file](instructions/2-customization.md)-->
* A list of [questions and answers](lambda/custom/config/questions.js) you can modify to create your own game without modifying the game code. **Note** this will require you to update slot values in your skill's language model. <!-- For more information see section on [adding your own questions](instructions/2-customization.md#changing-the-questions-and-answers) -->

### Pre-requisites

* Node.js (> v6.9)
* Register for an [AWS Account](https://aws.amazon.com/)
* Install and Setup [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/installing.html)
* Configure a named [AWS CLI Profile](https://docs.aws.amazon.com/cli/latest/userguide/cli-multiple-profiles.html)
* Register for an [Amazon Developer Account](https://developer.amazon.com/)
* Install and Setup [ASK CLI](https://developer.amazon.com/docs/smapi/quick-start-alexa-skills-kit-command-line-interface.html)

### Installation

1. Clone the repository.

	```bash
	$ git clone https://github.com/alexa/skill-sample-nodejs-buttons-trivia/
	```

2. Initialize the [ASK CLI](https://developer.amazon.com/docs/smapi/quick-start-alexa-skills-kit-command-line-interface.html) by Navigating into the repository and running the command: `ask init` and create a new profile called `trivia-skill`. Follow the prompts to configure the profile and associate it with one of your [AWS profiles](https://docs.aws.amazon.com/cli/latest/userguide/cli-multiple-profiles.html)

	```bash
	$ cd skill-sample-nodejs-buttons-trivia
	$ ask init
	```

3. Install npm dependencies by navigating into the `/lambda/custom` directory and running the npm command: `npm install`

	```bash
	$ cd lambda/custom
	$ npm install
	```


### Deployment

ASK CLI will create the skill and the lambda function for you. The Lambda function will be created in the region associated with the AWS profile that you selected.

1. Deploy the skill and the lambda function in one step by running the following command:

	```bash
	$ ask deploy -p trivia-skill
	```
### Add DynamoDB permissions to the Lambda role

The ASK CLI automatically created a role for your lambda function to run under that can execute lambda functions and write to cloudwatch logs, but since we are using the [built-in persistence](https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs/tree/master#persisting-skill-attributes-through-dynamodb) of the [Alexa Skills Kit for NodeJS SDK](https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs/tree/master), we need to add a policy that will allow the role to create/read/write to DynamoDB

1. Sign in to the [AWS Management Console](https://console.aws.amazon.com/console/home?region=us-east-1)
2. Navigate to the [IAM Service console](https://console.aws.amazon.com/iam/home?region=us-east-1) which is located under Compute services.
3. Click Roles on the left side bar and find the role created for you by the ASK CLI. The name should start with `ask-lambda-*`
4. On the Permissions tab, click the `Attach Policy` button
5. In the search box, search for `AmazonDynamoDBFullAccess`, select the policy by clicking the checkbox to the left, and click the `Attach Policy` button at the bottom of the page.

### Testing

1. To test, you need to login to Alexa Developer Console, and enable the "Test" switch on your skill from the "Test" Tab.

2. Simulate verbal interaction with your skill through the command line using the following example:

	```bash
	 $ ask simulate -l en-US -p trivia-skill -t "alexa, open buttons trivia"

	 ✓ Simulation created for simulation id: 4a7a9ed8-94b2-40c0-b3bd-fb63d9887fa7
	◡ Waiting for simulation response{
	  "status": "SUCCESSFUL",
	  ...
	 ```

3. Once the "Test" switch is enabled, your skill can be tested on devices associated with the developer account as well. Speak to Alexa from any enabled device, from your browser at [echosim.io](https://echosim.io/welcome), or through your Amazon Mobile App and say :

	```text
	Alexa, open buttons trivia
	```

## Customization

1. ```./skill.json```

   Change the skill name, example phrase, icons, testing instructions etc ...

   Remember that many information is locale-specific and must be changed for each locale (en-GB and en-US)

   See the Skill [Manifest Documentation](https://developer.amazon.com/docs/smapi/skill-manifest.html) for more information.

2. ```./lambda/custom/index.js```

   Modify messages, and facts from the source code to customize the skill.

3. ```./models/*.json```

	Change the model definition to replace the invocation name and the sample phrase for each intent.  Repeat the operation for each locale you are planning to support.



## Additional Resources

### Community
* [Amazon Developer Forums](https://forums.developer.amazon.com/spaces/311/gadgets-beta.html) - Join the conversation!
* [Hackster.io](https://www.hackster.io/amazon-alexa) - See what others are building with Alexa.

### Tutorials & Guides
* [Voice Design Guide](https://developer.amazon.com/designing-for-voice/) - A great resource for learning conversational and voice user interface design.
* [Color Changer Sample](https://developer.amazon.com/designing-for-voice/) - A simpler skill that shows how to do roll call and control light animations for Echo Buttons.

### Documentation
* [Official Alexa Skills Kit Documentation](https://developer.amazon.com/docs/ask-overviews/build-skills-with-the-alexa-skills-kit.html) - Official Alexa Skills Kit Documentation
* [Alexa Skills Kit Node.js SDK v1](https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs/blob/master/Readme.md) - **Note** that Alexa Skills Kit Node.js SDK v2 is now available  but this skill is built using Alexa Skills Kit Node.js SDK v1.

## License

This library is licensed under the Amazon Software License.
