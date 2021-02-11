import HouseCardAbility from "./HouseCardAbility";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import House from "../House";
import HouseCard from "./HouseCard";
import Unit from "../Unit";
import {knight} from "../unitTypes";

export default class SerAddamMarbrandAbility extends HouseCardAbility {
    modifyUnitCombatStrength(combat: CombatGameState, house: House, _houseCard: HouseCard, _houseSide: House, affectedUnit: Unit, _support: boolean, _currentStrength: number): number {
        return combat.attacker == house && affectedUnit.allegiance == house && affectedUnit.type == knight ? 1 : 0;
    }
}
