import HouseCard from "./HouseCard";
import HouseCardAbility from "./HouseCardAbility";
import House from "../House";
import AfterWinnerDeterminationGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/AfterWinnerDeterminationGameState";

export default class SerLorasTyrellHouseCardAbility extends HouseCardAbility {
  afterWinnerDetermination(
    afterWinner: AfterWinnerDeterminationGameState,
    house: House,
    _houseCard: HouseCard
  ): void {
    if (
      afterWinner.postCombatGameState.winner == house &&
      afterWinner.combatGameState.attacker == house &&
      !afterWinner.postCombatGameState.isAttackingArmyMovementPrevented()
    ) {
      afterWinner.postCombatGameState.orderMovingToDefendingRegion =
        afterWinner.combatGameState.order;
    }

    afterWinner.childGameState.onHouseCardResolutionFinish(house);
  }
}
