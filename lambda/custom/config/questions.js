'use strict';
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


/**
 * Questions library
 * 
 * Use this file to create your own set of questions.
 * 
 * Object properties:
 *      index:          The index of the question in this list
 *      question:       The question you want Alexa to ask
 *      answers:        The list of available answers
 *      correct_answer: The correct answer to the question
 * 
 * When adding or updating questions and answers, you must take the list of all values 
 * in each of the 'answers' arrays for all questions and add them to a custom slot 
 * in your skill called 'answers'.
 * 
 * The 'answers' custom slot is be mapped to a couple of intents in the interaction model.
 * One intent, named 'AnswerOnlyIntent', contains only the slot, by itself, in order 
 * to maximize the accuracy of the model.
 * 
 * For example: 
 *      AnswerOnlyIntent {answers}
 * 
 * The other intent, 'AnswerQuestionIntent', provides more complex speech patterns
 * to match other utternaces users may include with their answers.
 * 
 * For example:
 *      AnswerQuestionIntent is it {answers}
 *      AnswerQuestionIntent it is {answers}
 *      AnswerQuestionIntent the answer is {answers}
 *      AnswerQuestionIntent I think the answer is {answers}
 * 
 * See model file at models/en-US.json for a complete example.
 */
module.exports = Object.freeze({ 
    questions: [
        {
            index: 1,
            question: 'What is the name for a group of lions?',
            answers: ['pack', 'pride', 'den', 'frat'],
            correct_answer: 'pride'
        },
        {
            index: 2,
            question: 'Which of these mammals lay eggs: spiny anteaters, dolphins, echidnas, or squirrels?',
            answers: ['spiny anteaters', 'dolphins', 'echidnas', 'squirrels'],
            correct_answer: 'echidnas'
        },
        {
            index: 3,
            question: 'What type of animal is a seahorse?',
            answers: ['crustacean', 'arachnid', 'fish', 'shell'],
            correct_answer: 'fish'
        },
        {
            index: 4,
            question: 'What color are zebras?',
            answers: ['white with black stripes', 'black with white stripes'],
            correct_answer: 'black with white stripes'
        },
        {
            index: 5,
            question: 'Which type of animals have more teeth, reptiles or mammals?',
            answers: ['reptiles', 'mammals'],
            correct_answer: 'mammals'
        },
        {
            index: 6,
            question: 'What is the only venomous snake found in Britain?',
            answers: ['cobra', 'coral snake', 'copperhead', 'adder'],
            correct_answer: 'adder'
        },
        {
            index: 7,
            question: 'What is a female donkey called?',
            answers: ['joey', 'jenny', 'janet'],
            correct_answer: 'jenny'
        },
        {
            index: 8,
            question: 'What land mammal other than man has the longest lifespan?',
            answers: ['blue whale', 'dolphin', 'elephant', 'orangutan'],
            correct_answer: 'elephant'
        },
        {
            index: 9,
            question: 'Eskimos call what kind of creature a nanook?',
            answers: ['penguin', 'narwhal', 'polar bear', 'caribou'],
            correct_answer: 'polar bear'
        },
        {
            index: 10,
            question: 'Lupus is the Latin name for what animal?',
            answers: ['dog', 'cat', 'wolf', 'fox'],
            correct_answer: 'wolf'
        }

    ]
});
