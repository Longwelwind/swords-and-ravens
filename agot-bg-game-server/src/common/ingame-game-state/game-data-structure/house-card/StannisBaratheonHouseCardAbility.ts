import HouseCardAbility from "./HouseCardAbility";
import HouseCard from "./HouseCard";
import House from "../House";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";

export default class StannisBaratheonHouseCardAbility extends HouseCardAbility {

    modifyHouseCardCombatStrength(combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): number {
        return combat.game.isAheadInTrack(combat.game.ironThroneTrack, combat.getEnemy(house), house) && houseCard == affectedHouseCard
            ? 1
            : 0;
    }
}