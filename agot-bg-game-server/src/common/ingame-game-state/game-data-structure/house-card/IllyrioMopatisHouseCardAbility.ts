import HouseCardAbility from "./HouseCardAbility";
import House from "../House";
import HouseCard from "./HouseCard";
import AfterCombatHouseCardAbilitiesGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/AfterCombatHouseCardAbilitiesGameState";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";

export default class IllyrioMopatisHouseCardAbility extends HouseCardAbility {
    afterCombat(afterCombat: AfterCombatHouseCardAbilitiesGameState, house: House, houseCard: HouseCard): void {
        const houseFinalCombatStrength = Math.max(afterCombat.combatGameState.getTotalCombatStrength(house), 0);
        const enemyFinalCombatStrength = Math.max(afterCombat.combatGameState.getTotalCombatStrength(afterCombat.combatGameState.getEnemy(house)), 0);

        const difference = Math.abs(houseFinalCombatStrength-enemyFinalCombatStrength);

        const powerTokensGained = afterCombat.combatGameState.ingameGameState.changePowerTokens(house, difference);

        afterCombat.combatGameState.ingameGameState.log({
            type: "illyrio-mopatis-power-tokens-gained",
            house: house.id,
            powerTokensGained: powerTokensGained
        });

        if (house.powerTokens >= 5 && house.houseCards.has(houseCard.id)) {
            // Opponent house card may have been removed from game already
            house.houseCards.delete(houseCard.id);
            afterCombat.entireGame.broadcastToClients({
                type: "update-house-cards",
                house: house.id,
                houseCards: house.houseCards.keys
            });
            afterCombat.combatGameState.ingameGameState.log({
                type: "house-card-removed-from-game",
                house: house.id,
                houseCard: houseCard.id
            });
        }

        afterCombat.childGameState.onHouseCardResolutionFinish(house);
    }

    forcesValyrianSteelBladeDecision(_combat: CombatGameState, _valyrianSteelBladeHolder: House): boolean {
        return true;
    }
}