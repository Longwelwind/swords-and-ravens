import HouseCardAbility from "./HouseCardAbility";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import House from "../House";
import HouseCard from "./HouseCard";

export default class TheonGreyjoyHouseCardAbility extends HouseCardAbility {
    modifyHouseCardCombatStrength(combat: CombatGameState, house: House, _houseCard: HouseCard, _affectedHouseCard: HouseCard): number {
        return this.doesTrigger(combat, house, _houseCard, _affectedHouseCard) ? 1 : 0;
    }

    modifySwordIcons(combat: CombatGameState, house: House, _houseCard: HouseCard, _affectedHouseCard: HouseCard): number {
        return this.doesTrigger(combat, house, _houseCard, _affectedHouseCard) ? 1 : 0;
    }

    doesTrigger(combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): boolean {
        return houseCard == affectedHouseCard && combat.defender == house && combat.defendingRegion.hasStructure;
    }
}
