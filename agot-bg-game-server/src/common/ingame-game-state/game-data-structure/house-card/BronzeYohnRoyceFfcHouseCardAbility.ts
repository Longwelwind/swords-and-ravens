import HouseCardAbility from "./HouseCardAbility";
import HouseCard from "./HouseCard";
import House from "../House";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";

export default class BronzeYohnRoyceFfcHouseCardAbility extends HouseCardAbility {
  modifyCombatStrength(
    combat: CombatGameState,
    house: House,
    houseCard: HouseCard,
    affectedHouseCard: HouseCard,
  ): number {
    if (houseCard != affectedHouseCard) {
      return 0;
    }

    const enemy = combat.getEnemy(house);
    if (combat.ingameGameState.isVassalHouse(enemy)) {
      return house.powerTokens > 0 ? 1 : 0;
    }

    return house.powerTokens > enemy.powerTokens ? 1 : 0;
  }
}
