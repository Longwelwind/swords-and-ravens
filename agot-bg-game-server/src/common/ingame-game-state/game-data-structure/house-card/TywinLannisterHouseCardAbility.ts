import HouseCardAbility from "./HouseCardAbility";
import AfterWinnerDeterminationGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/AfterWinnerDeterminationGameState";
import House from "../House";
import HouseCard from "./HouseCard";

export default class TywinLannisterHouseCardAbility extends HouseCardAbility {
    afterWinnerDetermination(afterWinnerDetermination: AfterWinnerDeterminationGameState, house: House, _houseCard: HouseCard): void {
        if (afterWinnerDetermination.postCombatGameState.winner == house) {
            const powerTokensGained = house.changePowerTokens(2);

            afterWinnerDetermination.entireGame.broadcastToClients({
                type: "change-power-token",
                houseId: house.id,
                powerTokenCount: house.powerTokens
            });

            afterWinnerDetermination.combatGameState.ingameGameState.log({
                type: "tywin-lannister-power-tokens-gained",
                house: house.id,
                powerTokensGained: powerTokensGained
            });
        }

        afterWinnerDetermination.onHouseCardResolutionFinish();
    }
}
