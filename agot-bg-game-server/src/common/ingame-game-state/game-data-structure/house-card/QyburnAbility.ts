import HouseCardAbility from "./HouseCardAbility";
import HouseCard from "./HouseCard";
import House from "../House";
import QyburnAbilityGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/qyburn-ability-game-state/QyburnAbilityGameState";
import BeforeCombatHouseCardAbilitiesGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/BeforeCombatHouseCardAbilitiesGameState";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";

export default class QyburnHouseCardAbility extends HouseCardAbility {
  beforeCombatResolution(
    beforeCombat: BeforeCombatHouseCardAbilitiesGameState,
    house: House,
    _houseCard: HouseCard,
  ): void {
    beforeCombat.childGameState
      .setChildGameState(
        new QyburnAbilityGameState(beforeCombat.childGameState),
      )
      .firstStart(house);
  }

  modifyCombatStrength(
    combat: CombatGameState,
    _house: House,
    houseCard: HouseCard,
    affectedHouseCard: HouseCard,
  ): number {
    const houseCardModifier = combat.houseCardModifiers.tryGet(this.id, null);
    return houseCardModifier && houseCard == affectedHouseCard
      ? houseCardModifier.combatStrength
      : 0;
  }

  modifySwordIcons(
    combat: CombatGameState,
    _house: House,
    houseCard: HouseCard,
    affectedHouseCard: HouseCard,
  ): number {
    const houseCardModifier = combat.houseCardModifiers.tryGet(this.id, null);
    return houseCardModifier && houseCard == affectedHouseCard
      ? houseCardModifier.swordIcons
      : 0;
  }

  modifyTowerIcons(
    combat: CombatGameState,
    _house: House,
    houseCard: HouseCard,
    affectedHouseCard: HouseCard,
  ): number {
    const houseCardModifier = combat.houseCardModifiers.tryGet(this.id, null);
    return houseCardModifier && houseCard == affectedHouseCard
      ? houseCardModifier.towerIcons
      : 0;
  }
}
