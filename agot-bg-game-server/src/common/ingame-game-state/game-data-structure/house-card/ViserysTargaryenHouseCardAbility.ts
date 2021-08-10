import HouseCardAbility from "./HouseCardAbility";
import HouseCard from "./HouseCard";
import House from "../House";
import BeforeCombatHouseCardAbilitiesGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/BeforeCombatHouseCardAbilitiesGameState";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import AfterWinnerDeterminationGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/AfterWinnerDeterminationGameState";
import ViserysTargaryenAbilityGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/viserys-targaryen-ability-game-state/ViserysTargaryenAbilityGameState";

export default class ViserysTargaryenHouseCardAbility extends HouseCardAbility {
    beforeCombatResolution(beforeCombat: BeforeCombatHouseCardAbilitiesGameState, house: House, _houseCard: HouseCard): void {
        beforeCombat.childGameState.setChildGameState(new ViserysTargaryenAbilityGameState(beforeCombat.childGameState)).firstStart(house);
    }

    modifyCombatStrength(combat: CombatGameState, _house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): number {
        const houseCardModifier = combat.houseCardModifiers.tryGet(this.id, null);
        return houseCardModifier && houseCard == affectedHouseCard ? houseCardModifier.combatStrength : 0;
    }

    afterWinnerDetermination(afterWinnerDetermination: AfterWinnerDeterminationGameState, house: House, houseCard: HouseCard): void {
        if (afterWinnerDetermination.postCombatGameState.loser == house && house.houseCards.has(houseCard.id)) {
            afterWinnerDetermination.game.deletedHouseCards.set(houseCard.id, houseCard);
            afterWinnerDetermination.entireGame.broadcastToClients({
                type: "update-deleted-house-cards",
                houseCards: afterWinnerDetermination.game.deletedHouseCards.values.map(hc => hc.serializeToClient())
            });
            house.houseCards.delete(houseCard.id);
            afterWinnerDetermination.entireGame.broadcastToClients({
                type: "update-house-cards",
                house: house.id,
                houseCards: house.houseCards.values.map(hc => hc.serializeToClient())
            });

            afterWinnerDetermination.combatGameState.ingameGameState.log({
                type: "house-card-removed-from-game",
                house: house.id,
                houseCard: houseCard.id
            });
        }

        afterWinnerDetermination.childGameState.onHouseCardResolutionFinish(house);
    }
}
