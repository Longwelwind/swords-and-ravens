import HouseCardAbility from "./HouseCardAbility";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import HouseCard from "./HouseCard";
import Unit from "../Unit";
import House from "../House";
import { footman } from "../unitTypes";

export default class SyrioForelHouseCardAbility extends HouseCardAbility {

    modifyUnitCombatStrength(combat: CombatGameState, house: House, _houseCard: HouseCard, _houseSide: House, affectedUnit: Unit, _support: boolean, currentStrength: number): number {
        if (combat.defender == house) {
            if (affectedUnit.type == footman && !combat.ingameGameState.isVassalHouse(affectedUnit.allegiance)) {
                return -currentStrength;
            }
        }

        return 0;
    }
}