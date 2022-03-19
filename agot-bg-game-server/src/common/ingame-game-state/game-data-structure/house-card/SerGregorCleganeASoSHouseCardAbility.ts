import HouseCardAbility from "./HouseCardAbility";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import House from "../House";
import HouseCard from "./HouseCard";

export default class SerGregorCleganeASoSHouseCardAbility extends HouseCardAbility {
    modifySwordIcons(combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): number {
        if (houseCard != affectedHouseCard) {
            return 0;
        }
        const enemy = combat.getEnemy(house);
        const enemyHouseCardStrength = combat.houseCombatDatas.get(enemy).houseCard?.combatStrength ?? 0;
        return Math.max(0, 3 - enemyHouseCardStrength);
    }
}