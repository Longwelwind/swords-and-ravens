import HouseCardAbility from "./HouseCardAbility";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import HouseCard from "./HouseCard";
import House from "../House";

export default class CatelynStarkASoSHouseCardAbility extends HouseCardAbility {
  modifyCombatStrength(
    combat: CombatGameState,
    house: House,
    houseCard: HouseCard,
    affectedHouseCard: HouseCard,
  ): number {
    return this.doesTrigger(combat, house, houseCard, affectedHouseCard)
      ? 2
      : 0;
  }

  modifyTowerIcons(
    combat: CombatGameState,
    house: House,
    houseCard: HouseCard,
    affectedHouseCard: HouseCard,
  ): number {
    return this.doesTrigger(combat, house, houseCard, affectedHouseCard)
      ? 1
      : 0;
  }

  private doesTrigger(
    combat: CombatGameState,
    house: House,
    houseCard: HouseCard,
    affectedHouseCard: HouseCard,
  ): boolean {
    return houseCard == affectedHouseCard && combat.isHouseSupported(house);
  }
}
