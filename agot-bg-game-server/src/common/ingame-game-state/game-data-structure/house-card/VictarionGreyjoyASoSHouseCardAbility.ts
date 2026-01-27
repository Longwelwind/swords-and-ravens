import HouseCardAbility from "./HouseCardAbility";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import HouseCard from "./HouseCard";
import House from "../House";
import { sea } from "../regionTypes";

export default class VictarionGreyjoyASoSHouseCardAbility extends HouseCardAbility {
  modifyCombatStrength(
    combat: CombatGameState,
    house: House,
    houseCard: HouseCard,
    affectedHouseCard: HouseCard,
    _baseValue: number,
  ): number {
    return this.doesTrigger(combat, house, houseCard, affectedHouseCard)
      ? 1
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
    return (
      houseCard == affectedHouseCard &&
      combat.world
        .getNeighbouringRegions(combat.defendingRegion)
        .some((r) => r.type == sea)
    );
  }
}
