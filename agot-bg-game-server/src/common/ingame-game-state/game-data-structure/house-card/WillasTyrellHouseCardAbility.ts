import HouseCardAbility from "./HouseCardAbility";
import House from "../House";
import HouseCard from "./HouseCard";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";

export default class WillasTyrellHouseCardAbility extends HouseCardAbility {
  modifyCombatStrength(
    combat: CombatGameState,
    house: House,
    houseCard: HouseCard,
    affectedHouseCard: HouseCard,
  ): number {
    return houseCard == affectedHouseCard && combat.defender == house ? 2 : 0;
  }
}
