import HouseCardAbility from "./HouseCardAbility";
import HouseCard from "./HouseCard";
import House from "../House";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";

export default class MargaeryTyrellAdwdHouseCardAbility extends HouseCardAbility {

    modifyTotalCombatStrength(_combat: CombatGameState, _house: House, houseCard: HouseCard, _houseSide: House, currentStrength: number): number {
        console.log("Current strength:")
        console.log(currentStrength)
        return _house != _houseSide && _combat.defender == _house && (_combat.defendingRegion.superControlPowerToken == _house || _combat.defendingRegion.controlPowerToken) == _house ? - currentStrength + 2 : 0;
    }

}
