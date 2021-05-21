import HouseCardAbility from "./HouseCardAbility";
import HouseCard from "./HouseCard";
import House from "../House";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";

export default class BronzeYohnRoyceFfcHouseCardAbility extends HouseCardAbility {
    modifyCombatStrength(combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): number {
        return houseCard == affectedHouseCard && house.powerTokens > combat.ingameGameState.getControllerOfHouse(combat.getEnemy(house)).house.powerTokens ? 1 : 0;
    }
}