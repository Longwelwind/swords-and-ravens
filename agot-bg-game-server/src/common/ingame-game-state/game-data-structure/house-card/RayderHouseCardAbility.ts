import HouseCardAbility from "./HouseCardAbility";
import HouseCard from "./HouseCard";
import House from "../House";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";

export default class RayderHouseCardAbility extends HouseCardAbility {
    overwritesFinalCombatStrength(_combat: CombatGameState, _house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): boolean {
        return houseCard == affectedHouseCard;
    }

    finalCombatStrength(combat: CombatGameState, _house: House, houseCard: HouseCard, affectedHouseCard: HouseCard, strength: number): number {
        return this.overwritesFinalCombatStrength(combat, _house, houseCard, affectedHouseCard) ? combat.game.wildlingStrength: strength;
    }
}