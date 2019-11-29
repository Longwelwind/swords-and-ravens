import HouseCardAbility from "./HouseCardAbility";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import House from "../House";
import HouseCard from "./HouseCard";

export default class NymeriaSandHouseCardAbility extends HouseCardAbility {
    modifySwordIcons(combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): number {
        return combat.attacker == house && houseCard == affectedHouseCard ? 1 : 0;
    }

    modifyTowerIcons(combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): number {
        return combat.defender == house && houseCard == affectedHouseCard ? 1 : 0;
    }
}