import HouseCardAbility from "./HouseCardAbility";
import HouseCard from "./HouseCard";
import House from "../House";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";

export default class MargaeryTyrellDwDAbilityHouseCardAbility extends HouseCardAbility {
    private getAffectedHouse(house: House, combat: CombatGameState, houseCard: HouseCard, affectedHouseCard: HouseCard): House {
        return houseCard == affectedHouseCard ? house : combat.getEnemy(house);
    }

    overwritesFinalCombatStrength(combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): boolean {
        const affectedHouse = this.getAffectedHouse(house, combat, houseCard, affectedHouseCard);

        if (affectedHouse == combat.defender && (combat.defendingRegion.controlPowerToken == affectedHouse || combat.defendingRegion.superControlPowerToken == affectedHouse)) {
            return houseCard != affectedHouseCard;
        }

        return false;
    }

    finalCombatStrength(combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard, strength: number): number {
        return this.overwritesFinalCombatStrength(combat, house, houseCard, affectedHouseCard) ? 2 : strength;
    }
}