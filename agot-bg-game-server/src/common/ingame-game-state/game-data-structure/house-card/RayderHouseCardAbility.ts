import HouseCardAbility from "./HouseCardAbility";
import HouseCard from "./HouseCard";
import House from "../House";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";

export default class RayderHouseCardAbility extends HouseCardAbility {
    finalCombatStrength(combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard, strength: number) {
        return houseCard == affectedHouseCard ? combat.game.wildlingStrength: strength;
    }
}