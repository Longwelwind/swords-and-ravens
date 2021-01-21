import HouseCardAbility from "./HouseCardAbility";
import HouseCard from "./HouseCard";
import House from "../House";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";

export default class BalonGreyjoyHouseCardAbility extends HouseCardAbility {

    modifyHouseCardCombatStrength(_combat: CombatGameState, _house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): number {
        return houseCard != affectedHouseCard ? -affectedHouseCard.combatStrength : 0;
    }
}
