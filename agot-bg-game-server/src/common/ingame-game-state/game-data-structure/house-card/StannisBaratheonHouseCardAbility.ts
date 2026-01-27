import HouseCardAbility from "./HouseCardAbility";
import HouseCard from "./HouseCard";
import House from "../House";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";

export default class StannisBaratheonHouseCardAbility extends HouseCardAbility {
  modifyCombatStrength(
    combat: CombatGameState,
    house: House,
    houseCard: HouseCard,
    affectedHouseCard: HouseCard,
  ): number {
    return houseCard == affectedHouseCard &&
      combat.game.isAheadInTrack(
        combat.game.ironThroneTrack,
        combat.getEnemy(house),
        house,
      )
      ? 1
      : 0;
  }
}
