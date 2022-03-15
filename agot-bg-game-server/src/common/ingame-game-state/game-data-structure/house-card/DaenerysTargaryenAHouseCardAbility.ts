import HouseCardAbility from "./HouseCardAbility";
import HouseCard from "./HouseCard";
import House from "../House";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import { dragon } from "../unitTypes";

export default class DaenerysTargaryenAHouseCardAbility extends HouseCardAbility {
    modifyCombatStrength(combat: CombatGameState, _house: House, houseCard: HouseCard, affectedHouseCard: HouseCard, _baseValue: number): number {
        return houseCard == affectedHouseCard && combat.houseCombatDatas.values.some(hcd => hcd.army.some(u => u.type == dragon)) ? 2 : 0;
    }
}