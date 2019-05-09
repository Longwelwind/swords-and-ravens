import {setupAtPlanningGameState} from "../utils/setupGames";
import PlayerReconcileArmiesGameState
    from "../../src/common/ingame-game-state/westeros-game-state/reconcile-armies-game-state/player-reconcile-armies-game-state/PlayerReconcileArmiesGameState";
import BetterMap from "../../src/utils/BetterMap";
import PlanningGameState from "../../src/common/ingame-game-state/planning-game-state/PlanningGameState";
import * as _ from "lodash";

describe("supply westeros card type", () => {
    it("handles a simple reconciliation correctly", () => {
        setupAtPlanningGameState({
            units: {
                "the-reach": [
                    {type: "footman", allegiance: "lannister"},
                    {type: "footman", allegiance: "lannister"},
                    {type: "footman", allegiance: "lannister"},
                    {type: "footman", allegiance: "lannister"}
                ],
                "shipbreaker-bay": [
                    {type: "ship", allegiance: "lannister"},
                    {type: "ship", allegiance: "lannister"},
                    {type: "ship", allegiance: "lannister"}
                ],
                "kings-landing": [
                    {type: "footman", allegiance: "lannister"}
                ],
                "blackwater-bay": [
                    {type: "ship", allegiance: "stark"},
                    {type: "ship", allegiance: "stark"},
                    {type: "ship", allegiance: "stark"}
                ],
                "blackwater": [
                    {type: "footman", allegiance: "stark"},
                    {type: "footman", allegiance: "stark"}
                ]
            },
            houses: {
                stark: {
                    supplyLevel: 1
                },
                lannister: {
                    supplyLevel: 5
                }
            },
            firstWesterosDeck: [{type: "supply"}],
            ironThroneTrack: ["stark", "lannister", "baratheon", "greyjoy"]
        }).execute(globalContext => {
            globalContext.forEach((context, planning) => expect(planning.game.hasTooMuchArmies(context.lannister)).toBeFalsy());
            globalContext.forEach((context, planning) => expect(planning.game.hasTooMuchArmies(context.stark)).toBeFalsy());
            globalContext.forEach((context, planning) => expect(planning.game.hasTooMuchArmies(context.baratheon)).toBeFalsy());
            globalContext.forEach((context, planning) => expect(planning.game.hasTooMuchArmies(context.greyjoy)).toBeFalsy());

            globalContext.forEachClients((_, planning) => planning.ready());

            return globalContext.expectGameState<PlayerReconcileArmiesGameState>(PlayerReconcileArmiesGameState);
        }).execute(globalContext => {
            globalContext.forEach((context, _) => expect(context.lannister.supplyLevel).toBe(2));
            globalContext.forEach((context, _) => expect(context.stark.supplyLevel).toBe(0));

            globalContext.forEach((context, reconcile) => expect(reconcile.house).toBe(context.stark));

            globalContext.stark.as((context, reconcile) => reconcile.reconcileArmies(new BetterMap([
                [context.blackwaterBay, [context.blackwaterBay.units.values[0]]]
            ])));

            return globalContext.expectGameState<PlayerReconcileArmiesGameState>(PlayerReconcileArmiesGameState);
        }).execute(globalContext => {
            globalContext.forEach((context, reconcile) => expect(reconcile.house).toBe(context.lannister));

            globalContext.lannister.as((context, reconcile) => reconcile.reconcileArmies(new BetterMap([
                [context.theReach, _.take(context.theReach.units.values, 2)],
            ])));

            globalContext.expectGameState<PlanningGameState>(PlanningGameState);
        });
    })
});
