#  Build An Alexa 'Better with Buttons' Trivia Game
<img src="https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/fact/header._TTH_.png" />

**Important: The Gadgets Skill API is in beta and is subject to change at any time without notice. We welcome your feedback.**

This Alexa sample skill is a template for a trivia game which is played with [Echo Buttons](https://www.amazon.com/Echo-Buttons-Alexa-Gadget-Pack/dp/B072C4KCQH) in multiplayer mode but can also be played without buttons in single player mode. Provided a list of interesting questions about a topic, Alexa will select a group of questions to ask the player(s), keep score throughout, and announce the winner at the end of the game.

This sample skill demonstrates how to discover Echo Buttons using [roll call](https://developer.amazon.com/docs/gadget-skills/discover-echo-buttons.html#goals), how to [receive Echo Button events](https://developer.amazon.com/docs/gadget-skills/receive-echo-button-events.html), and how to [animate the Echo Button lights](https://developer.amazon.com/docs/gadget-skills/control-echo-buttons.html#animate).

You may use this sample game as a starting point to build your own 'Better with Buttons' trivia game. You can customize Alexa's voice responses, the question list, and some game options without making changes to the code. However, to provide a truely unique game experience code changes will likely be necessary.

### About
This guide assumes you have your developer environment ready to go and that you have some familiarity with CLI (Command Line Interface) Tools, [AWS](https://aws.amazon.com/), and the [ASK Developer Portal](https://developer.amazon.com/alexa-skills-kit).

### Pre-requisites

* Node.js (> v8)
* Register for an [AWS Account](https://aws.amazon.com/)
* Register for an [Amazon Developer Account](https://developer.amazon.com)


[![Get Started](https://camo.githubusercontent.com/db9b9ce26327ad3bac57ec4daf0961a382d75790/68747470733a2f2f6d2e6d656469612d616d617a6f6e2e636f6d2f696d616765732f472f30312f6d6f62696c652d617070732f6465782f616c6578612f616c6578612d736b696c6c732d6b69742f7475746f7269616c732f67656e6572616c2f627574746f6e732f627574746f6e5f6765745f737461727465642e5f5454485f2e706e67)](./instructions/1-voice-user-interface.md)

Or click [here](./instructions/7-cli.md) for instructions using the ASK CLI (command line interface).

## Additional Resources

### Community
* [Amazon Developer Forums](https://forums.developer.amazon.com/spaces/311/gadgets-beta.html) - Join the conversation!
* [Hackster.io](https://www.hackster.io/amazon-alexa) - See what others are building with Alexa.

### Tutorials & Guides
* [Voice Design Guide](https://developer.amazon.com/designing-for-voice/) - A great resource for learning conversational and voice user interface design.
* [Codecademy: Learn Alexa](https://www.codecademy.com/learn/learn-alexa) - Learn how to build an Alexa Skill from within your browser with this beginner friendly tutorial on Codecademy!
* [Echo Buttons Color Changer Sample Skill](https://github.com/alexa/skill-sample-nodejs-buttons-colorchanger) - A simpler skill that shows how to do roll call and control light animations for Echo Buttons.

### Documentation
* [Official Alexa Skills Kit Node.js SDK](https://www.npmjs.com/package/ask-sdk) - The Official Node.js SDK Documentation
* [Official Alexa Skills Kit Documentation](https://developer.amazon.com/docs/ask-overviews/build-skills-with-the-alexa-skills-kit.html) - Official Alexa Skills Kit Documentation
* [Official Alexa Gadgets Documentation](https://developer.amazon.com/alexa/alexa-gadgets) - The Echo Buttons are the first Alexa Gadget

<p align="center">
  <br/>
  <br/>
  <img src="https://images-na.ssl-images-amazon.com/images/I/61GquaDrMWL._SY450_.jpg"/>
</p>
