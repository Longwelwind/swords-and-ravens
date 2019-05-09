import {setupAtPlanningGameState} from "./utils/setupGames";
import {marchMinusOneOrder} from "../src/common/ingame-game-state/game-data-structure/orders";
import ResolveSingleMarchOrderGameState
    from "../src/common/ingame-game-state/action-game-state/resolve-march-order-game-state/resolve-single-march-order-game-state/ResolveSingleMarchOrderGameState";
import ChooseHouseCardGameState
    from "../src/common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/choose-house-card-game-state/ChooseHouseCardGameState";
import BetterMap from "../src/utils/BetterMap";
import {HouseCardState} from "../src/common/ingame-game-state/game-data-structure/house-card/HouseCard";
import PlanningGameState from "../src/common/ingame-game-state/planning-game-state/PlanningGameState";
import UseValyrianSteelBladeGameState
    from "../src/common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/use-valyrian-steel-blade-game-state/UseValyrianSteelBladeGameState";

describe("combat game state", () => {
    it("makes all house cards available when the last one is used", () => {
        setupAtPlanningGameState({
            houses: {
                lannister: {
                    houseCards: [
                        {
                            id: "mace-tyrell",
                            combatStrength: 2
                        },
                        {
                            id: "loras-tyrell",
                            combatStrength: 3,
                            state: HouseCardState.USED
                        }
                    ]
                },
                stark: {
                    houseCards: [
                        {
                            id: "eddard-stark",
                            combatStrength: 1
                        },
                        {
                            id: "robb-stark"
                        }
                    ]
                }
            },
            units: {
                "the-reach": [{type: "footman", allegiance: "lannister", wounded: false}],
                "blackwater": [{type: "knight", allegiance: "stark", wounded: false}]
            }
        }).execute(globalContext => {
            globalContext.lannister.as((context, planning) => planning.assignOrder(context.theReach, marchMinusOneOrder));

            globalContext.forEachClients((context, planning) => planning.ready());

            return globalContext.expectGameState<ResolveSingleMarchOrderGameState>(ResolveSingleMarchOrderGameState);
        }).execute(globalContext => {
            globalContext.master.as((context, resolveSingleMarchOrder) => {
                expect(resolveSingleMarchOrder.house).toBe(context.lannister);
            });

            globalContext.lannister.as((context, resolveSingleMarchOrder) => {
                resolveSingleMarchOrder.sendMoves(
                    context.theReach,
                    new BetterMap([[context.blackwater, context.theReach.units.values]]),
                    false
                );
            });

            return globalContext.expectGameState<ChooseHouseCardGameState>(ChooseHouseCardGameState);
        }).execute(globalContext => {
            globalContext.lannister.as((context, chooseHouseCard) => chooseHouseCard.chooseHouseCard(context.houseCard("mace-tyrell")));
            globalContext.stark.as((context, chooseHouseCard) => chooseHouseCard.chooseHouseCard(context.houseCard("eddard-stark")));

            return globalContext.expectGameState<UseValyrianSteelBladeGameState>(UseValyrianSteelBladeGameState);
        }).execute(globalContext => {


            globalContext.lannister.as((_, useValyrianSteelBlade) => useValyrianSteelBlade.choose(false));

            return globalContext.expectGameState<PlanningGameState>(PlanningGameState);
        }).execute(globalContext => {
            globalContext.forEach((context, _) => {
                expect(context.houseCard("mace-tyrell").state).toBe(HouseCardState.USED);
                expect(context.houseCard("loras-tyrell").state).toBe(HouseCardState.AVAILABLE);
                expect(context.houseCard("eddard-stark").state).toBe(HouseCardState.USED);
                expect(context.houseCard("robb-stark").state).toBe(HouseCardState.AVAILABLE);
            });
        });
    });
});
