import {setupAtPlanningGameState} from "./utils/setupGames";
import ResolveSingleMarchOrderGameState
    from "../src/common/ingame-game-state/action-game-state/resolve-march-order-game-state/resolve-single-march-order-game-state/ResolveSingleMarchOrderGameState";
import {marchMinusOneOrder, marchOrder} from "../src/common/ingame-game-state/game-data-structure/orders";
import BetterMap from "../src/utils/BetterMap";
import PlanningGameState from "../src/common/ingame-game-state/planning-game-state/PlanningGameState";

describe("resolve march order", () => {
    it("allows two simple march orders", () => {
        setupAtPlanningGameState({
            units: {
                "shipbreaker-bay": [
                    {type: "ship", allegiance: "lannister"}
                ],
                "kings-landing": [
                    {type: "footman", allegiance: "lannister"},
                    {type: "footman", allegiance: "lannister"}
                ],
                "blackwater": [
                    {type: "footman", allegiance: "lannister"}
                ]
            }
        }).execute(globalContext => {
            globalContext.lannister.as((context, planning) => {
                planning.assignOrder(context.kingsLanding, marchMinusOneOrder);
                planning.assignOrder(context.blackwater, marchOrder);
            });

            globalContext.forEachClients((context, planning) => planning.ready());

            return globalContext.expectGameState<ResolveSingleMarchOrderGameState>(ResolveSingleMarchOrderGameState);
        }).execute(globalContext => {
            globalContext.forEach((context, resolveSingleMarchOrder) => {
                expect(resolveSingleMarchOrder.actionGameState.ordersOnBoard.get(context.kingsLanding)).toBe(marchMinusOneOrder);
                expect(resolveSingleMarchOrder.actionGameState.ordersOnBoard.get(context.blackwater)).toBe(marchOrder);
            });

            globalContext.lannister.as((context, resolveSingleMarchOrder) => {
                resolveSingleMarchOrder.sendMoves(
                    context.blackwater,
                    new BetterMap([
                        [context.theReach, context.blackwater.units.values]
                    ]),
                    false
                );
            });

            return globalContext.expectGameState<ResolveSingleMarchOrderGameState>(ResolveSingleMarchOrderGameState);
        }).execute(globalContext => {
            globalContext.forEach((context, resolveSingleMarchOrder) => {
                expect(resolveSingleMarchOrder.actionGameState.ordersOnBoard.has(context.blackwater)).toBe(false);
                expect(resolveSingleMarchOrder.actionGameState.ordersOnBoard.has(context.kingsLanding)).toBe(true);

                expect(context.blackwater.units.size).toBe(0);
                expect(context.theReach.units.size).toBe(1);
            });
        });
    });
    it("allows ships to be used as a bridge for land units", () => {
        setupAtPlanningGameState({
            units: {
                "blackwater-bay": [
                    {type: "ship", allegiance: "lannister"}
                ],
                "shipbreaker-bay": [
                    {type: "ship", allegiance: "lannister"}
                ],
                "kings-landing": [
                    {type: "footman", allegiance: "lannister"}
                ]
            }
        }).execute(globalContext => {
            globalContext.lannister.as((context, planning) => planning.assignOrder(context.kingsLanding, marchMinusOneOrder));

            globalContext.forEachClients((_, planning) => planning.ready());

            return globalContext.expectGameState<ResolveSingleMarchOrderGameState>(ResolveSingleMarchOrderGameState);
        }).execute(globalContext => {
            globalContext.lannister.as((context, resolveSingleMarchOrder) => resolveSingleMarchOrder.sendMoves(
                context.kingsLanding,
                new BetterMap([[context.dragonstone, context.kingsLanding.units.values]]),
                false
            ));

            return globalContext.expectGameState<PlanningGameState>(PlanningGameState);
        }).execute(globalContext => {
            globalContext.forEach((context, _) => {
                expect(context.dragonstone.getController() == context.lannister);
                expect(context.kingsLanding.units.size).toBe(0);
                expect(context.dragonstone.units.size).toBe(1);
            });
        });
    });
});
