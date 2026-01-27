import HouseCardAbility from "./HouseCardAbility";
import HouseCard from "./HouseCard";
import House from "../House";
import BeforeCombatHouseCardAbilitiesGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/BeforeCombatHouseCardAbilitiesGameState";
import BronnAbilityGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/bronn-ability-game-state/BronnAbilityGameState";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";

export default class BronnHouseCardAbility extends HouseCardAbility {
  beforeCombatResolution(
    beforeCombat: BeforeCombatHouseCardAbilitiesGameState,
    house: House,
    _houseCard: HouseCard,
  ): void {
    beforeCombat.childGameState
      .setChildGameState(new BronnAbilityGameState(beforeCombat.childGameState))
      .firstStart(house);
  }

  modifyCombatStrength(
    combat: CombatGameState,
    _house: House,
    houseCard: HouseCard,
    affectedHouseCard: HouseCard,
    _baseValue: number,
  ): number {
    const houseCardModifier = combat.houseCardModifiers.tryGet(this.id, null);
    return houseCardModifier && houseCard == affectedHouseCard
      ? houseCardModifier.combatStrength
      : 0;
  }
}
