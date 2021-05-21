import HouseCardAbility from "./HouseCardAbility";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import House from "../House";
import HouseCard from "./HouseCard";
import { land, sea } from "../regionTypes";

export default class GodricBorrellHouseCardAbility extends HouseCardAbility {
    modifyCombatStrength(combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): number {
        return houseCard == affectedHouseCard && combat.defender == house && combat.defendingRegion.type == sea
            ? combat.world.getNeighbouringRegions(combat.defendingRegion).filter(r => r.type == land && r.getController() == house).length
            : 0;
    }
}
