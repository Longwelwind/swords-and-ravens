import HouseCardAbility from "./HouseCardAbility";
import AfterWinnerDeterminationGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/AfterWinnerDeterminationGameState";
import House from "../House";
import HouseCard, {HouseCardState} from "./HouseCard";

export default class QarlTheMaidHouseCardAbility extends HouseCardAbility {
    afterWinnerDetermination(afterWinnerDetermination: AfterWinnerDeterminationGameState, house: House, _houseCard: HouseCard): void {
        if (afterWinnerDetermination.postCombatGameState.loser == house && afterWinnerDetermination.postCombatGameState.attacker == house) {
            const powerTokensGained = afterWinnerDetermination.combatGameState.ingameGameState.changePowerTokens(house, 3);

            afterWinnerDetermination.combatGameState.ingameGameState.log({
                type: "qarl-the-maid-tokens-gained",
                house: house.id,
                powerTokensGained: powerTokensGained
            });
        }
        afterWinnerDetermination.childGameState.onHouseCardResolutionFinish(house);
    }
};
