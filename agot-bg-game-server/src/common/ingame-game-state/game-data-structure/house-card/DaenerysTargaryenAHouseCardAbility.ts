import HouseCardAbility from "./HouseCardAbility";
import HouseCard from "./HouseCard";
import House from "../House";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import { dragon } from "../unitTypes";

export default class DaenerysTargaryenAHouseCardAbility extends HouseCardAbility {
    modifyCombatStrength(combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): number {
        return houseCard == affectedHouseCard && combat.houseCombatDatas.get(house).army.filter(u => u.type == dragon).length > 0 ? 2 : 0;
    }
}