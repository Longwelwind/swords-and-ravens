import HouseCardAbility from "./HouseCardAbility";
import House from "../House";
import HouseCard from "./HouseCard";
import BeforeCombatHouseCardAbilitiesGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/BeforeCombatHouseCardAbilitiesGameState";
import SupportOrderType from "../order-types/SupportOrderType";
import RaidSupportOrderType from "../order-types/RaidSupportOrderType";
import BetterMap from "../../../../utils/BetterMap";

export default class StannisBaratheonDwDHouseCardAbility extends HouseCardAbility {
    beforeCombatResolution(beforeCombatResolutionState: BeforeCombatHouseCardAbilitiesGameState, house: House, _houseCard: HouseCard): void {
        const actionGameState = beforeCombatResolutionState.combatGameState.actionGameState;
        const combatGameState = beforeCombatResolutionState.combatGameState;
        const game = beforeCombatResolutionState.game
        if (combatGameState.supporters.entries.every(([_supporter, supported]) => supported != house)) {
            const regions = game.world.getNeighbouringRegions(combatGameState.defendingRegion)
                                .filter(r => actionGameState.ordersOnBoard.has(r))
                                .map(r => ({r, o: actionGameState.ordersOnBoard.get(r)}))
                                .filter(({o}) => o.type instanceof SupportOrderType || o.type instanceof RaidSupportOrderType)
                                .map(({r}) => r);

            regions.forEach(r => beforeCombatResolutionState.combatGameState.actionGameState.removeOrderFromRegion(r));
            combatGameState.supporters = new BetterMap();
        }

        // Todo: Log which orders have been removed by Stannis
        beforeCombatResolutionState.childGameState.onHouseCardResolutionFinish(house);
    }
}
