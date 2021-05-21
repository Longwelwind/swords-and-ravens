import HouseCardAbility from "./HouseCardAbility";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import House from "../House";
import HouseCard from "./HouseCard";

export default class SerVardisEgenHouseCardAbility extends HouseCardAbility {
    modifyTowerIcons(combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): number {
        return this.doesTrigger(combat, houseCard, affectedHouseCard, house) ? 2 : 0;
    }

    modifyCombatStrength(combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): number {
        return this.doesTrigger(combat, houseCard, affectedHouseCard, house) ? 1 : 0;
    }

    doesTrigger(combat: CombatGameState, houseCard: HouseCard, affectedHouseCard: HouseCard, house: House): boolean {
        if (houseCard != affectedHouseCard) {
            return false;
        }

        const enemy = combat.getEnemy(house);
        const enemyHouseCard = combat.houseCombatDatas.get(enemy).houseCard;
        return enemyHouseCard ? enemyHouseCard.combatStrength <= 2 : false;
    }
}
