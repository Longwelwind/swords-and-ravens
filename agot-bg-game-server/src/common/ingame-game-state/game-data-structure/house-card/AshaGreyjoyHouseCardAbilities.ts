import HouseCardAbility from "./HouseCardAbility";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import HouseCard from "./HouseCard";
import House from "../House";

export default class AshaGreyjoyHouseCardAbilities extends HouseCardAbility {
    modifySwordIcons(combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): number {
        return this.doesTrigger(combat, house, houseCard, affectedHouseCard) ? 2 : 0;
    }

    modifyTowerIcons(combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): number {
        return this.doesTrigger(combat, house, houseCard, affectedHouseCard) ? 1 : 0;
    }

    private doesTrigger(combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): boolean {
        // As a possible support order may have been removed by an opponents immediately ability house card
        // we have to use getSupportStrengthForSide instead of the supporters map 
        // as getSupportStrengthForSide will respect getPossibleSupportingRegions
        return houseCard == affectedHouseCard && combat.getSupportStrengthForSide(house) == 0;
    }
}