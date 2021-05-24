import HouseCardAbility from "./HouseCardAbility";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import House from "../House";
import HouseCard from "./HouseCard";
import { land } from "../regionTypes";
import { ship } from "../unitTypes";
import _ from "lodash";

export default class CaptainGroleoHouseCardAbility extends HouseCardAbility {
    modifyCombatStrength(combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): number {
        if (houseCard != affectedHouseCard
            || combat.attacker != house
            || combat.defendingRegion.type != land
            || !combat.world.getReachableRegions(combat.attackingRegion, house, combat.attackingArmy, true).includes(combat.defendingRegion)) {
            return 0;
        }

        const adjacentShips = _.flatMap(combat.world.getNeighbouringRegions(combat.defendingRegion).map(r => r.units.values))
            .filter(u => u.allegiance == house && u.type == ship);

        return adjacentShips.length;
    }
}
