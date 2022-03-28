import HouseCardAbility from "./HouseCardAbility";
import House from "../House";
import HouseCard from "./HouseCard";
import AfterWinnerDeterminationGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/AfterWinnerDeterminationGameState";

export default class SalladharSaanASoSHouseCardAbility extends HouseCardAbility {
    afterWinnerDetermination(afterWinnerDetermination: AfterWinnerDeterminationGameState, house: House, _houseCard: HouseCard): void {
        if (afterWinnerDetermination.postCombatGameState.winner == house) {
            const combat = afterWinnerDetermination.combatGameState;
            const enemy = combat.getEnemy(house);
            const powerTokensGained = combat.ingameGameState.changePowerTokens(house, 2);
            const powerTokensLost = combat.ingameGameState.changePowerTokens(enemy, -2);

            afterWinnerDetermination.combatGameState.ingameGameState.log({
                type: "salladhar-saan-asos-power-tokens-changed",
                house: house.id,
                powerTokensGained: powerTokensGained,
                affectedHouse: enemy.id,
                powerTokensLost: Math.abs(powerTokensLost)
            });
        }

        afterWinnerDetermination.childGameState.onHouseCardResolutionFinish(house);
    }
}
