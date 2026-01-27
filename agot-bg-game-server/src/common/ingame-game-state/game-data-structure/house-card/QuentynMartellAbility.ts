import HouseCardAbility from "./HouseCardAbility";
import HouseCard, { HouseCardState } from "./HouseCard";
import House from "../House";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";

export default class QuentynMartellAbility extends HouseCardAbility {
  modifyCombatStrength(
    _combat: CombatGameState,
    _house: House,
    houseCard: HouseCard,
    affectedHouseCard: HouseCard,
    _baseValue: number,
  ): number {
    return houseCard == affectedHouseCard
      ? _house.houseCards.values.filter((hc) => hc.state == HouseCardState.USED)
          .length
      : 0;
  }
}
