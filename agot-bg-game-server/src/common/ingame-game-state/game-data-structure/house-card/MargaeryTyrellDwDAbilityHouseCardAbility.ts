import HouseCardAbility from "./HouseCardAbility";
import HouseCard from "./HouseCard";
import House from "../House";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";

export default class MargaeryTyrellDwDAbilityHouseCardAbility extends HouseCardAbility {
    doesOverwriteFinalCombatStrength(combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): boolean {
        if (houseCard == affectedHouseCard) {
            return false;
        }

        const houseUsingMargaery = combat.getEnemy(house);
        return houseUsingMargaery == combat.defender && (combat.defendingRegion.controlPowerToken == houseUsingMargaery || combat.defendingRegion.superControlPowerToken == houseUsingMargaery);
    }

    finalCombatStrength(combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard, strength: number): number {
        return this.doesOverwriteFinalCombatStrength(combat, house, houseCard, affectedHouseCard) ? 2 : strength;
    }
}