import {setupAtPlanningGameState} from "./utils/setupGames";
import {
    firstSupportOrder,
    marchOrder
} from "../src/common/ingame-game-state/game-data-structure/orders";
import ResolveSingleMarchOrderGameState
    from "../src/common/ingame-game-state/action-game-state/resolve-march-order-game-state/resolve-single-march-order-game-state/ResolveSingleMarchOrderGameState";
import BetterMap from "../src/utils/BetterMap";
import PlanningGameState from "../src/common/ingame-game-state/planning-game-state/PlanningGameState";

describe("resolve march order game state", () => {
    it("handles a march order against a neutral force", () => {
        setupAtPlanningGameState({
            units: {
                "blackwater-bay": [
                    {type: "ship", allegiance: "lannister", wounded: false},
                    {type: "ship", allegiance: "lannister", wounded: false},
                    {type: "ship", allegiance: "lannister", wounded: false},
                ],
                "the-reach": [{type: "knight", allegiance: "lannister", wounded: false}],
                "blackwater": [{type: "footman", allegiance: "stark", wounded: false}]
            },
            regions: {
                "kings-landing": {garrison: 5}
            }
        }).execute(globalContext => {
            globalContext.forEach((context, _) => {
                expect(context.kingsLanding.garrison).toBe(5);
                expect(context.kingsLanding.getController()).toBeNull();
            });

            globalContext.lannister.as((context, planning) => {
                planning.assignOrder(context.theReach, marchOrder);
                planning.assignOrder(context.blackwaterBay, firstSupportOrder)
            });

            globalContext.stark.as((context, planning) => {
                planning.assignOrder(context.blackwater, firstSupportOrder);
            });

            globalContext.forEachClients((context, planning) => planning.ready());

            return globalContext.expectGameState<ResolveSingleMarchOrderGameState>(ResolveSingleMarchOrderGameState);
        }).execute(globalContext => {
            globalContext.lannister.as((context, resolveSingleMarchOrder) => {
                resolveSingleMarchOrder.sendMoves(
                    context.theReach,
                    new BetterMap([[context.kingsLanding, context.theReach.units.values]]),
                    false
                );
            });

            return globalContext.expectGameState<PlanningGameState>(PlanningGameState);
        }).execute(globalContext => {
            globalContext.forEach((context, _) => expect(context.kingsLanding.getController()).toBe(context.lannister));
            globalContext.forEach((context, _) => expect(context.kingsLanding.garrison).toBe(0));
        });
    });
});
