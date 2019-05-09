import {setupAtPlanningGameState} from "../utils/setupGames";
import PlanningGameState from "../../src/common/ingame-game-state/planning-game-state/PlanningGameState";
import BiddingGameState from "../../src/common/ingame-game-state/westeros-game-state/bidding-game-state/BiddingGameState";
import ResolveTiesGameState
    from "../../src/common/ingame-game-state/westeros-game-state/clash-of-kings-game-state/resolve-ties-game-state/ResolveTiesGameState";
import ClashOfKingsGameState
    from "../../src/common/ingame-game-state/westeros-game-state/clash-of-kings-game-state/ClashOfKingsGameState";

describe("mustering westeros card type", () => {
    it("handles a normal mustering", () => {
        setupAtPlanningGameState({
            firstWesterosDeck: [{type: "clash-of-kings"}],
            houses: {
                lannister: {
                    powerTokens: 10
                },
                greyjoy: {
                    powerTokens: 10
                },
                stark: {
                    powerTokens: 15
                },
                baratheon: {
                    powerTokens: 12
                }
            },
            ironThroneTrack: ["stark", "lannister", "baratheon", "greyjoy"]
        }).execute(globalContext => {
            globalContext.forEachClients((_, planning) => planning.ready());

            return globalContext.expectGameState<BiddingGameState<ClashOfKingsGameState>>(BiddingGameState);
        }).execute(globalContext => {
            globalContext.lannister.as((_, bidding) => bidding.bid(1));
            globalContext.stark.as((_, bidding) => bidding.bid(2));
            globalContext.greyjoy.as((_, bidding) => bidding.bid(3));
            globalContext.baratheon.as((_, bidding) => bidding.bid(4));

            return globalContext.expectGameState<BiddingGameState<ClashOfKingsGameState>>(BiddingGameState);;
        }).execute(globalContext => {
            globalContext.forEach(
                (context, bidding) => expect(bidding.game.ironThroneTrack).toEqual([context.baratheon, context.greyjoy, context.stark, context.lannister])
            );

            globalContext.lannister.as((_, bidding) => bidding.bid(4));
            globalContext.stark.as((_, bidding) => bidding.bid(3));
            globalContext.greyjoy.as((_, bidding) => bidding.bid(3));
            globalContext.baratheon.as((_, bidding) => bidding.bid(1));

            return globalContext.expectGameState<ResolveTiesGameState>(ResolveTiesGameState);
        }).execute(globalContext => {
            globalContext.forEach((context, resolveTies) => expect(resolveTies.decider).toBe(context.baratheon));

            globalContext.baratheon.as((context, resolveTies) => resolveTies.resolveTies([
                [context.stark, context.greyjoy]
            ]));

            return globalContext.expectGameState<BiddingGameState<ClashOfKingsGameState>>(BiddingGameState);
        }).execute(globalContext => {
            globalContext.forEach(
                (context, bidding) => expect(bidding.game.fiefdomsTrack).toEqual([context.lannister, context.stark, context.greyjoy, context.baratheon])
            );

            globalContext.greyjoy.as((_, bidding) => bidding.bid(4));
            globalContext.baratheon.as((_, bidding) => bidding.bid(4));
            globalContext.lannister.as((_, bidding) => bidding.bid(1));
            globalContext.stark.as((_, bidding) => bidding.bid(1));

            return globalContext.expectGameState<ResolveTiesGameState>(ResolveTiesGameState);
        }).execute(globalContext => {
            globalContext.forEach((context, resolveTies) => expect(resolveTies.decider).toBe(context.baratheon));

            globalContext.baratheon.as((context, resolveTies) => resolveTies.resolveTies([
                [context.baratheon, context.greyjoy],
                [context.lannister, context.stark]
            ]));

            return globalContext.expectGameState<PlanningGameState>(PlanningGameState);
        }).execute(globalContext => {
            globalContext.forEach(
                (context, bidding) => expect(bidding.game.kingsCourtTrack).toEqual([context.baratheon, context.greyjoy, context.lannister, context.stark])
            );
        });
    });
});
