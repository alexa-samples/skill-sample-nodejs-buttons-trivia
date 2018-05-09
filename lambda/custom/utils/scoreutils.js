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
'use strict';

module.exports = {

    /*
     * assuming scores is an object that looks like this:
     *    scores = {
     *       "2":  3,
     *       "4":  2
     *    };
     * and a `numPlayers` parameter that specifies the total number of players participating,
     * this method produces an aggregate count, for each unit score, like so:
     * 
     *     orderedScoreGroups = [
     *         { score: 3, players: [2] },
     *         { score: 2, players: [4] },
     *         { score: 0, players: [1,3] },
     *     ]
     */ 
    getOrderedScoreGroups: function(scores, numPlayers) {
        scores = scores || {};
        numPlayers = numPlayers || 1;
        
        let scoreGroups = {};
        for(var i = 1; i <= numPlayers; i++) {
           scores[i] = scores[i] || 0; 
           let score = scores[i];  
           if (!scoreGroups[score]) {
              scoreGroups[score] = [];
           } 
           scoreGroups[score].push(i);   
        }
        let scoreKeys = Object.keys(scoreGroups).sort().reverse();
        let orderedScoreGroups = [];
        for (var k = 0; k < scoreKeys.length; k++) {
            orderedScoreGroups.push({
                score: scoreKeys[k],
                players: scoreGroups[scoreKeys[k]]
            });
        }

        return orderedScoreGroups;
    }
};