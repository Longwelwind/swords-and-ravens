import HouseCardAbility from "./HouseCardAbility";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import House from "../House";
import HouseCard from "./HouseCard";
import * as _ from "lodash";

export default class WalderFreyHouseCardAbility extends HouseCardAbility {
    modifySupportStrength(combat: CombatGameState, houseCard: HouseCard, affectedHouseCard: HouseCard, house: House, strength: number): number {
        let supportedHouse: House;
        if (houseCard == affectedHouseCard) {
            supportedHouse = combat.getEnemy(house);
        } else {
            supportedHouse = house;
        }

        const supportedVal = combat.supporters.entries
        .filter(([supporter, supported]) => supportedHouse == supported && supporter != supportedHouse)
        .map(([supporter, _supported]) => {
            // Compute the total strength that this supporting house is bringing
            // to the combat
            return combat.getPossibleSupportingRegions()
                .filter(({region}) => region.getController() == supporter)
                .map(({region, support}) => {
                    const strengthOfArmy = combat.getCombatStrengthOfArmy(supportedHouse, region.units.values, true);
                    // Take into account the possible support order bonus
                    const supportOrderBonus = support.supportModifier;
                    return strengthOfArmy + supportOrderBonus;
                })
                .reduce(_.add, 0);
        })
        .reduce(_.add, 0);

        return houseCard == affectedHouseCard ? strength+supportedVal : strength-supportedVal;
    }
}
