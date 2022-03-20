import HouseCardAbility from "./HouseCardAbility";
import House from "../House";
import HouseCard from "./HouseCard";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import AfterWinnerDeterminationGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/AfterWinnerDeterminationGameState";

export default class BalonGreyjoyASoSHouseCardAbility extends HouseCardAbility {
    afterWinnerDetermination(afterWinnerDetermination: AfterWinnerDeterminationGameState, house: House, _houseCard: HouseCard): void {
        if (afterWinnerDetermination.postCombatGameState.winner == house) {
            const totalDifference = Math.abs(afterWinnerDetermination.combatGameState.stats[0].total -
                afterWinnerDetermination.combatGameState.stats[1].total);

            const powerTokensGained = afterWinnerDetermination.combatGameState.ingameGameState.changePowerTokens(house, totalDifference);

            afterWinnerDetermination.combatGameState.ingameGameState.log({
                type: "balon-greyjoy-asos-power-tokens-gained",
                house: house.id,
                powerTokensGained: powerTokensGained
            });
        }

        afterWinnerDetermination.childGameState.onHouseCardResolutionFinish(house);
    }

    forcesValyrianSteelBladeDecision(_combat: CombatGameState, _valyrianSteelBladeHolder: House): boolean {
        return true;
    }
}
