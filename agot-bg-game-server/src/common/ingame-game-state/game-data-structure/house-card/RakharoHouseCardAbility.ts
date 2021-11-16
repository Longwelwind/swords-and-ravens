import HouseCardAbility from "./HouseCardAbility";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import HouseCard from "./HouseCard";
import House from "../House";
import Unit from "../Unit";
import { knight } from "../unitTypes";
import { land } from "../regionTypes";

export default class RakharoHouseCardAbility extends HouseCardAbility {
    modifyUnitCombatStrength(combat: CombatGameState, house: House, _houseCard: HouseCard, _houseSide: House, affectedUnit: Unit, support: boolean, _currentStrength: number): number {
        return !support && combat.defendingRegion.type == land && combat.defendingRegion.castleLevel == 0 && affectedUnit.allegiance == house && affectedUnit.type == knight
            ? 2
            : 0;
    }
}
