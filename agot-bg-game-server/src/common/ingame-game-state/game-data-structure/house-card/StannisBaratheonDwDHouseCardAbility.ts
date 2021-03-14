import HouseCardAbility from "./HouseCardAbility";
import House from "../House";
import HouseCard from "./HouseCard";
import BeforeCombatHouseCardAbilitiesGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/BeforeCombatHouseCardAbilitiesGameState";

export default class StannisBaratheonDwDHouseCardAbility extends HouseCardAbility {

    beforeCombatResolution(beforeCombatResolutionState: BeforeCombatHouseCardAbilitiesGameState, house: House, _houseCard: HouseCard): void {
        const actionGameState = beforeCombatResolutionState.combatGameState.actionGameState;
        const combatGameState = beforeCombatResolutionState.combatGameState;
        const game = beforeCombatResolutionState.game
        if (beforeCombatResolutionState.combatGameState.supporters.entries.every(([_supporter, supportee]) => supportee != house)) {
            const regions = game.world.getNeighbouringRegions(combatGameState.defendingRegion)
                                .filter(r => actionGameState.ordersOnBoard.has(r))
                                .map(r => ({r, o: actionGameState.ordersOnBoard.get(r)}))
                                .filter(({o}) => o.type.id == 'support' || o.type.id == 'support-plus-one')
                                .map(({r}) => r);
            regions.forEach(r => beforeCombatResolutionState.combatGameState.actionGameState.ordersOnBoard.delete(r));
            regions.forEach(r => {
                beforeCombatResolutionState.combatGameState.actionGameState.entireGame.broadcastToClients({
                    type: "action-phase-change-order",
                    region: r.id,
                    order: null
                });
            });
        }

        // Todo: Log which orders have been removed by Stannis
        beforeCombatResolutionState.childGameState.onHouseCardResolutionFinish(house);
    }
}
