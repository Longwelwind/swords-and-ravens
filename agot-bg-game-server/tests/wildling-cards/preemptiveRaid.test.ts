import {setupAtPlanningGameState} from "../utils/setupGames";
import BiddingGameState
    from "../../src/common/ingame-game-state/westeros-game-state/bidding-game-state/BiddingGameState";
import SimpleChoiceGameState from "../../src/common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SelectUnitsGameState from "../../src/common/ingame-game-state/select-units-game-state/SelectUnitsGameState";
import PlanningGameState from "../../src/common/ingame-game-state/planning-game-state/PlanningGameState";
import WildlingAttackGameState
    from "../../src/common/ingame-game-state/westeros-game-state/wildling-attack-game-state/WildlingAttackGameState";
import * as _ from "lodash";
import BetterMap from "../../src/utils/BetterMap";

describe("preemptive raid wildling card", () => {
    it("on a wildling victory, allows 2 units to be destroyed anywhere", () => {
        setupAtPlanningGameState({
            wildlingDeck: [{type: "preemptive-raid"}],
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
                    {type: "ship", allegiance: "greyjoy"}
                ]
            }
        }).execute(globalContext => {
            globalContext.forEachClients((_, planning) => planning.ready());

            // A full turn will pass with nothing happening.
            // At the beginning of the next turn, a wildling attack should occur
            return globalContext.expectGameState<BiddingGameState<WildlingAttackGameState>>(BiddingGameState);
        }).execute(globalContext => {
            globalContext.lannister.as((_, bidding) => bidding.bid(1));
            globalContext.baratheon.as((_, bidding) => bidding.bid(2));
            globalContext.greyjoy.as((_, bidding) => bidding.bid(0));
            globalContext.stark.as((_, bidding) => bidding.bid(3));

            return globalContext.expectGameState<SimpleChoiceGameState>(SimpleChoiceGameState);
        }).execute(globalContext => {
            globalContext.greyjoy.as((_, simpleChoice) => simpleChoice.choose(0));

            return globalContext.expectGameState<SelectUnitsGameState>(SelectUnitsGameState);
        }).execute(globalContext => {
            globalContext.greyjoy.as((context, selectUnits) => selectUnits.selectUnits(new BetterMap([
                [context.theReach, [context.theReach.units.values[0]]],
                [context.blackwaterBay, [context.blackwaterBay.units.values[0]]]
            ])));

            return globalContext.expectGameState<PlanningGameState>(PlanningGameState);
        }).execute(globalContext => {
            globalContext.forEach((context, _) => {
                expect(context.theReach.units.size).toBe(2);
                expect(context.blackwaterBay.units.size).toBe(0);
            });
        });
    });


    it("on a night's watch victory, triggers a new wildling attack of strength 6 without the highest bidder", () => {
        setupAtPlanningGameState({
            wildlingDeck: [{type: "preemptive-raid"}],
            wildlingStrength: 10
        }).execute(globalContext => {
            globalContext.forEachClients((_, planning) => planning.ready());

            // A full turn will pass with nothing happening.
            // At the beginning of the next turn, a wildling attack should occur
            return globalContext.expectGameState<BiddingGameState<WildlingAttackGameState>>(BiddingGameState);
        }).execute(globalContext => {
            globalContext.lannister.as((_, bidding) => bidding.bid(4));
            globalContext.baratheon.as((_, bidding) => bidding.bid(3));
            globalContext.greyjoy.as((_, bidding) => bidding.bid(3));
            globalContext.stark.as((_, bidding) => bidding.bid(5));

            return globalContext.expectGameState<BiddingGameState<WildlingAttackGameState>>(BiddingGameState);
        }).execute(globalContext => {
            globalContext.forEach((context, bidding) => {
                expect(bidding.parentGameState.wildlingStrength).toBe(6);
                expect(bidding.parentGameState.participatingHouses.length).toBe(3);
                expect(bidding.parentGameState.participatingHouses).toEqual(expect.arrayContaining(_.difference(context.game.houses.values, [context.stark])));
            })
        })
    });
});
