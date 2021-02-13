import HouseCardAbility from "./HouseCardAbility";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import House from "../House";
import HouseCard from "./HouseCard";
import SupportOrderType from "../../game-data-structure/order-types/SupportOrderType";
import * as _ from "lodash";

export default class WalderFreyHouseCardAbility extends HouseCardAbility {
    modifySupportStrength(_combat: CombatGameState, _houseCard: HouseCard, _affectedHouseCard: HouseCard, _house: House, strength: number): number {
        let supportedHouse: House;
        if (_houseCard == _affectedHouseCard) {
            supportedHouse = _combat.getEnemy(_house);
        } else {
            supportedHouse = _house;
        }

        const supportedVal = _combat.supporters.entries
        .filter(([_house, supHouse]) => supportedHouse == supHouse && _house != supportedHouse)
        .map(([house, _supHouse]) => {
            // Compute the total strength that this supporting house is bringing
            // to the combat
            return _combat.getPossibleSupportingRegions()
                .filter(({region}) => region.getController() == house)
                .map(({region}) => {
                    const strengthOfArmy = _combat.getCombatStrengthOfArmy(supportedHouse, region.units.values, true);
                    // Take into account the possible support order bonus
                    const supportOrder = _combat.actionGameState.ordersOnBoard.get(region);

                    if (!(supportOrder.type instanceof SupportOrderType)) {
                        throw new Error();
                    }

                    const supportOrderBonus = supportOrder.type.supportModifier;

                    return strengthOfArmy + supportOrderBonus;
                })
                .reduce(_.add, 0);
        })
        .reduce(_.add, 0);

        return _houseCard == _affectedHouseCard ? strength+supportedVal : strength-supportedVal;
    }
}
