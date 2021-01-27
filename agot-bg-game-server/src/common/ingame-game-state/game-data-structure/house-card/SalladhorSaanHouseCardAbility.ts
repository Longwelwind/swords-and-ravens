import HouseCardAbility from "./HouseCardAbility";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import HouseCard from "./HouseCard";
import Unit from "../Unit";
import House from "../House";
import {ship} from "../unitTypes";

export default class SalladhorSaanHouseCardAbility extends HouseCardAbility {

    modifyUnitCombatStrength(combat: CombatGameState, house: House, _houseCard: HouseCard, _houseSide: House, affectedUnit: Unit, _support: boolean, currentStrength: number): number {
        // Check that the owner of this card is being supported
        if (combat.isHouseSupported(house)) {
            // Check that it is a non-owned ship
            if (affectedUnit.type == ship && affectedUnit.allegiance != house) {
                return -currentStrength;
            }
        }

        return 0;
    }
}
