import {setupAtPlanningGameState} from "../utils/setupGames";
import PlayerMusteringGameState
    , {Mustering} from "../../src/common/ingame-game-state/westeros-game-state/mustering-game-state/player-mustering-game-state/PlayerMusteringGameState";
import BetterMap from "../../src/utils/BetterMap";
import {footman} from "../../src/common/ingame-game-state/game-data-structure/unitTypes";
import Region from "../../src/common/ingame-game-state/game-data-structure/Region";
import PlanningGameState from "../../src/common/ingame-game-state/planning-game-state/PlanningGameState";

describe("mustering westeros card type", () => {
    it("forbids mustering that goes over supply", () => {
        setupAtPlanningGameState({
            units: {
                "dragonstone": [
                    {type: "footman", allegiance: "stark"},
                    {type: "footman", allegiance: "stark"}
                ]
            },
            firstWesterosDeck: [{type: "mustering"}],
            ironThroneTrack: ["stark", "lannister", "baratheon", "greyjoy"]
        }).execute(globalContext => {
            globalContext.forEachClients((_, planning) => planning.ready());

            return globalContext.expectGameState<PlayerMusteringGameState>(PlayerMusteringGameState);
        }).execute(globalContext => {
            globalContext.forEach((context, playerMustering) => expect(playerMustering.house).toBe(context.stark));

            // Should be refused because it goes over the supply limit
            globalContext.stark.as((context, playerMustering) => playerMustering.muster(
                new BetterMap<Region, Mustering[]>([
                    [context.dragonstone, [
                        {from: null, to: footman, region: context.dragonstone},
                        {from: null, to: footman, region: context.dragonstone}
                    ]]
                ])
            ));

            globalContext.expectGameState<PlayerMusteringGameState>(PlayerMusteringGameState);
        });
    });

    it("handles a normal mustering", () => {
        setupAtPlanningGameState({
            units: {
                "dragonstone": [
                    {type: "footman", allegiance: "stark"},
                    {type: "footman", allegiance: "stark"}
                ]
            },
            firstWesterosDeck: [{type: "mustering"}],
            ironThroneTrack: ["stark", "lannister", "baratheon", "greyjoy"]
        }).execute(globalContext => {
            globalContext.forEachClients((_, planning) => planning.ready());

            return globalContext.expectGameState<PlayerMusteringGameState>(PlayerMusteringGameState);
        }).execute(globalContext => {
            globalContext.forEach((context, playerMustering) => expect(playerMustering.house).toBe(context.stark));

            globalContext.stark.as((context, playerMustering) => playerMustering.muster(
                new BetterMap<Region, Mustering[]>([
                    [context.dragonstone, [
                        {from: null, to: footman, region: context.dragonstone}
                    ]]
                ])
            ));

            globalContext.expectGameState<PlanningGameState>(PlanningGameState);
        });
    });
});
