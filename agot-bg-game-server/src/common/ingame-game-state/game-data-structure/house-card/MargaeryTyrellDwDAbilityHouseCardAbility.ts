import HouseCardAbility from "./HouseCardAbility";
import HouseCard from "./HouseCard";
import House from "../House";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";

export default class MargaeryTyrellDwDAbilityHouseCardAbility extends HouseCardAbility {
    finalCombatStrength(combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard, strength: number) {
        let defender: House;
        if (houseCard == affectedHouseCard) {
            defender = house;
        } else {
            defender = combat.getEnemy(house);
        }

        if (defender == combat.defender && (combat.defendingRegion.controlPowerToken == defender || combat.defendingRegion.superControlPowerToken == defender)) {
            return houseCard != affectedHouseCard ? 2 : strength
        }

        return strength;
    }
}