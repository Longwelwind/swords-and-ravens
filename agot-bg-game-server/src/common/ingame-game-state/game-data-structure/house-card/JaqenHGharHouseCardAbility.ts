import HouseCardAbility from "./HouseCardAbility";
import CancelHouseCardAbilitiesGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/cancel-house-card-abilities-game-state/CancelHouseCardAbilitiesGameState";
import House from "../House";
import HouseCard, { HouseCardState } from "./HouseCard";
import shuffleInPlace from "../../../../utils/shuffleInPlace";
import _ from "lodash";

export default class JaqenHGharHouseCardAbility extends HouseCardAbility {
  cancel(
    cancelResolutionState: CancelHouseCardAbilitiesGameState,
    house: House,
    houseCard: HouseCard,
  ): void {
    const combat = cancelResolutionState.combatGameState;
    const enemy = combat.getEnemy(house);

    // As Jaqen returns the house card to the enemies hand there definitely is at least one card to pick
    const newHouseCard = shuffleInPlace(
      enemy.houseCards.values.filter(
        (hc) => hc.state == HouseCardState.AVAILABLE,
      ),
    )[0];

    combat.ingameGameState.log({
      type: "jaqen-h-ghar-house-card-replaced",
      house: house.id,
      affectedHouse: enemy.id,
      oldHouseCard: (combat.houseCombatDatas.get(enemy).houseCard as HouseCard)
        .id,
      newHouseCard: newHouseCard.id,
      usedById: houseCard.id,
    });

    // Change the new house card to the chosen one
    combat.houseCombatDatas.get(enemy).houseCard = newHouseCard;
    combat.entireGame.broadcastToClients({
      type: "change-combat-house-card",
      houseCardIds: [
        [house.id, combat.houseCombatDatas.get(house).houseCard?.id ?? null],
        [enemy.id, newHouseCard.id],
      ],
      animate: true,
    });

    _.pull(cancelResolutionState.childGameState.resolvedHouses, enemy);
    cancelResolutionState.childGameState.onHouseCardResolutionFinish(house);
  }

  changesEnemyHouseCardImmediately(): boolean {
    return true;
  }

  isCancelAbility(): boolean {
    return true;
  }
}
