import HouseCard from "./HouseCard";
import HouseCardAbility from "./HouseCardAbility";
import House from "../House";
import AfterCombatHouseCardAbilitiesGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/AfterCombatHouseCardAbilitiesGameState";

export default class SerLorasTyrellHouseCardAbility extends HouseCardAbility {

    afterCombat(afterCombat: AfterCombatHouseCardAbilitiesGameState, house: House, _houseCard: HouseCard): void {
        if (afterCombat.postCombatGameState.winner == house
                && afterCombat.combatGameState.attacker == house
                && !afterCombat.postCombatGameState.isAttackingArmyMovementPrevented()) {

            afterCombat.combatGameState.actionGameState.ordersOnBoard.set(
                afterCombat.combatGameState.defendingRegion,
                afterCombat.combatGameState.order
            );

            afterCombat.parentGameState.parentGameState.ingameGameState.sendMessageToPlayersWhoCanSeeRegion({
                type: "action-phase-change-order",
                region: afterCombat.combatGameState.defendingRegion.id,
                order: afterCombat.combatGameState.order.id,
                animate: "white"
            }, afterCombat.combatGameState.defendingRegion);

            afterCombat.parentGameState.combat.ingameGameState.log({
                type: "loras-tyrell-attack-order-moved",
                house: house.id,
                region: afterCombat.combatGameState.defendingRegion.id,
                order: afterCombat.combatGameState.order.id
            });
        }

        afterCombat.childGameState.onHouseCardResolutionFinish(house);
    }
}
