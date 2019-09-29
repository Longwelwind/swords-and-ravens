import {setupAtPlanningGameState} from "../utils/setupGames";
import setupAtWildlingAttackGameState from "../utils/setupAtWildlingAttackGameState";

describe("crow killers wildling card", () => {
    it("forces knights to be transformed into footmen on a wildling victory", () => {
        setupAtWildlingAttackGameState({
            wildlingDeck: [{type: "crow-killers"}],
            wildlingStrength: 10,
            units: {
                "the-reach": [
                    {type: "footman", allegiance: "greyjoy"},
                    {type: "footman", allegiance: "greyjoy"},
                    {type: "knight", allegiance: "greyjoy"}
                ],
                "kings-landing": [
                    {type: "footman", allegiance: "stark"}
                ],
                "blackwater-bay": [
                    {type: "ship", allegiance: "lannister"}
                ]
            }
        }).execute(globalContext => {
            globalContext.lannister.as((_, bidding) => bidding.bid(0));
            globalContext.stark.as((_, bidding) => bidding.bid(1));
            globalContext.greyjoy.as((_, bidding) => bidding.bid(2));
            globalContext.baratheon.as((_, bidding) => bidding.bid(1));
        });
    });
});
