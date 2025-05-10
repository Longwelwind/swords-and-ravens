import HouseCardAbility from "./HouseCardAbility";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import House from "../House";
import HouseCard from "./HouseCard";
import Unit from "../Unit";
import { knight } from "../unitTypes";
import AfterCombatHouseCardAbilitiesGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/AfterCombatHouseCardAbilitiesGameState";

export default class KhalDrogoHouseCardAbility extends HouseCardAbility {
  modifyUnitCombatStrength(
    _combat: CombatGameState,
    house: House,
    _houseCard: HouseCard,
    _houseSide: House,
    affectedUnit: Unit,
    support: boolean,
    _currentStrength: number
  ): number {
    return !support &&
      affectedUnit.allegiance == house &&
      affectedUnit.type == knight
      ? 1
      : 0;
  }

  modifySwordIcons(
    combat: CombatGameState,
    house: House,
    houseCard: HouseCard,
    affectedHouseCard: HouseCard
  ): number {
    return houseCard == affectedHouseCard
      ? combat.houseCombatDatas.get(house).army.filter((u) => u.type == knight)
          .length
      : 0;
  }

  afterCombat(
    afterCombat: AfterCombatHouseCardAbilitiesGameState,
    house: House,
    houseCard: HouseCard
  ): void {
    // Due to HC evo, Drogo may not be longer present in the players house card deck, so let's check this
    if (house.houseCards.has(houseCard.id)) {
      afterCombat.game.deletedHouseCards.set(houseCard.id, houseCard);
      afterCombat.entireGame.broadcastToClients({
        type: "update-deleted-house-cards",
        houseCards: afterCombat.game.deletedHouseCards.values.map(
          (hc) => hc.id
        ),
      });

      house.houseCards.delete(houseCard.id);
      afterCombat.entireGame.broadcastToClients({
        type: "update-house-cards",
        house: house.id,
        houseCards: house.houseCards.keys,
      });

      afterCombat.combatGameState.ingameGameState.log({
        type: "house-card-removed-from-game",
        house: house.id,
        houseCard: houseCard.id,
      });
    }

    afterCombat.childGameState.onHouseCardResolutionFinish(house);
  }
}
