import HouseCardAbility from "./HouseCardAbility";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import HouseCard from "./HouseCard";
import House from "../House";
import Unit from "../Unit";
import {ship} from "../unitTypes";
import {sea} from "../../game-data-structure/regionTypes";


export default class PaxterRedwyneAdwdHouseCardAbility extends HouseCardAbility {
    
    modifyUnitCombatStrength(combat: CombatGameState, house: House, _houseCard: HouseCard, _houseSide: House, affectedUnit: Unit, _support: boolean, _currentStrength: number): number {
        if (combat.defendingRegion.type == sea && affectedUnit.allegiance == house && affectedUnit.type == ship) {
            return 1;
        }

        return 0;
    }
}

