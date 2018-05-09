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
// HTML color Picker site - https://www.w3schools.com/colors/colors_picker.asp
// Choose a shade darker than you intend

'use strict';

var COLORS = {
        "white":"ffffff",
        "red":"ff0000",
        "orange":"ff3300",
        "green":"00ff00",
        "dark green":"004411",
        "blue":"0000ff",
        "light blue":"00a0b0",        
        "purple":"4b0098",
        "yellow":"ffd400",
        "black":"000000"
};

module.exports = {
    getColor: function(colorName) {
        if (typeof colorName === 'string' &&
            COLORS[colorName.toLowerCase()] ) {
            return COLORS[colorName.toLowerCase()];
        }
        console.log("UNKNOWN COLOR: " + colorName);
    }
};