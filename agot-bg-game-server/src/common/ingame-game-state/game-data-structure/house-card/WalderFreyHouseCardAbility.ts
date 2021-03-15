import HouseCardAbility from "./HouseCardAbility";
import House from "../House";
import HouseCard from "./HouseCard";
import BeforeCombatHouseCardAbilitiesGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/BeforeCombatHouseCardAbilitiesGameState";

export default class WalderFreyHouseCardAbility extends HouseCardAbility {
    beforeCombatResolution(beforeCombat: BeforeCombatHouseCardAbilitiesGameState, house: House, _houseCard: HouseCard): void {
        const combat = beforeCombat.combatGameState;
        const enemy = combat.getEnemy(house);
        combat.supporters.keys.forEach(supporter => {
            const supporting = combat.supporters.get(supporter);
            if (supporter != enemy && supporting == enemy) {
                combat.supporters.set(supporter, house);
            }
        });

        beforeCombat.childGameState.onHouseCardResolutionFinish(house);
    }
}
