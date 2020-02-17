import {setupAtPlanningGameState} from "../utils/setupGames";
import BiddingGameState from "../../src/common/ingame-game-state/westeros-game-state/bidding-game-state/BiddingGameState";
import PlanningGameState from "../../src/common/ingame-game-state/planning-game-state/PlanningGameState";
import SimpleChoiceGameState from "../../src/common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import WildlingsAttackGameState
    from "../../src/common/ingame-game-state/westeros-game-state/wildling-attack-game-state/WildlingAttackGameState";

describe("wildling attack game state", () => {
    it("handles correctly a simple wildling attack where the night's watch wins", () => {
        setupAtPlanningGameState({
            wildlingStrength: 10
        }).execute(globalContext => {
            globalContext.forEachClients((_, planning) => planning.ready());

            return globalContext.expectGameState<BiddingGameState<WildlingsAttackGameState>>(BiddingGameState);
        }).execute(globalContext => {
            globalContext.forEach((context) => {
                expect(context.game.wildlingStrength).toBe(12);
            });

            globalContext.lannister.as((_, bidding) => bidding.bid(4));
            globalContext.greyjoy.as((_, bidding) => bidding.bid(5));
            globalContext.stark.as((_, bidding) => bidding.bid(4));
            globalContext.baratheon.as((_, bidding) => bidding.bid(4));

            globalContext.expectGameState<PlanningGameState>(PlanningGameState);
        }).execute(globalContext => {
            globalContext.forEach((context) => expect(context.game.wildlingStrength).toBe(0));
        });
    });

    it("handles correctly a simple wildling attack where the wildling wins", () => {
        setupAtPlanningGameState({
            wildlingStrength: 8
        }).execute(globalContext => {
            globalContext.forEachClients((_, planning) => planning.ready());

            return globalContext.expectGameState<BiddingGameState<WildlingsAttackGameState>>(BiddingGameState);
        }).execute(globalContext => {
            globalContext.forEach((context, _) => expect(context.game.wildlingStrength).toBe(12));

            globalContext.lannister.as((_, bidding) => bidding.bid(1));
            globalContext.greyjoy.as((_, bidding) => bidding.bid(0));
            globalContext.stark.as((_, bidding) => bidding.bid(1));
            globalContext.baratheon.as((_, bidding) => bidding.bid(2));


            return globalContext.expectGameState<PlanningGameState>(PlanningGameState);
        }).execute(globalContext => {
            globalContext.forEach((context, _) => expect(context.game.wildlingStrength).toBe(10));
        });
    });

    it("handles correctly a wildling attack where the wildling wins and there is a tie", () => {
        setupAtPlanningGameState({
            wildlingStrength: 8,
            ironThroneTrack: ["greyjoy", "stark", "baratheon", "lannister"]
        }).execute(globalContext => {
            globalContext.forEachClients((_, planning) => planning.ready());

            return globalContext.expectGameState<BiddingGameState<WildlingsAttackGameState>>(BiddingGameState);
        }).execute(globalContext => {
            globalContext.forEach((context, bidding) => {
                expect(context.game.wildlingStrength).toBe(12);
                expect(bidding.parentGameState.participatingHouses).toEqual(expect.arrayContaining(context.game.houses.values));
            });

            globalContext.lannister.as((_, bidding) => bidding.bid(0));
            globalContext.greyjoy.as((_, bidding) => bidding.bid(0));
            globalContext.stark.as((_, bidding) => bidding.bid(1));
            globalContext.baratheon.as((_, bidding) => bidding.bid(1));

            return globalContext.expectGameState<SimpleChoiceGameState>(SimpleChoiceGameState);
        }).execute(globalContext => {
            globalContext.greyjoy.as((context, simpleChoice) => simpleChoice.choose(simpleChoice.choices.indexOf("Lannister")));

            return globalContext.expectGameState<PlanningGameState>(PlanningGameState);
        }).execute(globalContext => {
            globalContext.forEach((context, _) => expect(context.game.wildlingStrength).toBe(10));
        });
    });
});
