import HouseCardAbility from "./HouseCardAbility";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import DefenseOrderType from "../order-types/DefenseOrderType";
import HouseCard from "./HouseCard";
import House from "../House";

export default class CatelynStarkHouseCardAbility extends HouseCardAbility {
    modifyDefenseOrderBonus(_combat: CombatGameState, _house: House, _houseCard: HouseCard, houseSide: House, defenseOrderType: DefenseOrderType, _currentBonus: number): number {
        if (_house == houseSide) {
            return defenseOrderType.defenseModifier;
        }

        return 0;
    }
}