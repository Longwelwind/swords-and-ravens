import HouseCardAbility from "./HouseCardAbility";
import AfterWinnerDeterminationGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/AfterWinnerDeterminationGameState";
import House from "../House";
import HouseCard from "./HouseCard";

export default class TywinLannisterHouseCardAbility extends HouseCardAbility {
    afterWinnerDetermination(afterWinnerDetermination: AfterWinnerDeterminationGameState, house: House, _houseCard: HouseCard): void {
        if (afterWinnerDetermination.postCombatGameState.winner == house) {
            const powerTokensGained = afterWinnerDetermination.combatGameState.ingameGameState.changePowerTokens(house, 2);

            afterWinnerDetermination.combatGameState.ingameGameState.log({
                type: "tywin-lannister-power-tokens-gained",
                house: house.id,
                powerTokensGained: powerTokensGained
            });
        }

        afterWinnerDetermination.onHouseCardResolutionFinish();
    }
}
