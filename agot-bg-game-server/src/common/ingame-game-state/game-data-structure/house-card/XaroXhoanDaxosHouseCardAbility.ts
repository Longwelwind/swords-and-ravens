import HouseCardAbility from "./HouseCardAbility";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import House from "../House";
import HouseCard from "./HouseCard";
import Unit from "../Unit";
import {ship} from "../unitTypes";

export default class XaroXhoanDaxosHouseCardAbility extends HouseCardAbility {
    modifyUnitCombatStrength(combat: CombatGameState, house: House, _houseCard: HouseCard, _houseSide: House, affectedUnit: Unit, _support: boolean, _currentStrength: number): number {
        const enemy = combat.getEnemy(house);
        const ships = combat.houseCombatDatas.get(house).army.filter(u => u.type == ship);
        const enemyShips = combat.houseCombatDatas.get(enemy).army.filter(u => u.type == ship);
        return affectedUnit.allegiance == house && affectedUnit.type == ship && ships.length > enemyShips.length ? 1 : 0;
    }
}
