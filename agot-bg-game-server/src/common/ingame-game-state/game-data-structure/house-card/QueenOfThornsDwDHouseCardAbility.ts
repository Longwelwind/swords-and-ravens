import HouseCardAbility from "./HouseCardAbility";
import HouseCard from "./HouseCard";
import House from "../House";
import CancelHouseCardAbilitiesGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/cancel-house-card-abilities-game-state/CancelHouseCardAbilitiesGameState";

export default class QueenOfThornsDwDHouseCardAbility extends HouseCardAbility {
  cancel(
    cancelResolutionState: CancelHouseCardAbilitiesGameState,
    house: House,
    _houseCard: HouseCard,
  ): void {
    const card = cancelResolutionState.combatGameState.houseCombatDatas.get(
      cancelResolutionState.combatGameState.getEnemy(house),
    ).houseCard;
    if (card) {
      card.disabledAbility = card.ability;
      card.disabled = true;
      card.ability = null;

      cancelResolutionState.entireGame.broadcastToClients({
        type: "manipulate-combat-house-card",
        manipulatedHouseCards: [card].map((c) => [c.id, c.serializeToClient()]),
      });
    }

    cancelResolutionState.childGameState.onHouseCardResolutionFinish(house);
  }

  isCancelAbility(): boolean {
    return true;
  }
}
