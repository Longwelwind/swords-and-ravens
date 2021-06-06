import HouseCardAbility from "./HouseCardAbility";
import AfterWinnerDeterminationGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/AfterWinnerDeterminationGameState";
import House from "../House";
import HouseCard from "./HouseCard";
import MissandeiAbilityGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/missandei-ability-game-state/MissandeiAbilityGameState";

export default class MissandeiHouseCardAbility extends HouseCardAbility {
    afterWinnerDetermination(afterWinnerDetermination: AfterWinnerDeterminationGameState, house: House, _houseCard: HouseCard): void {
        const difference = Math.abs(afterWinnerDetermination.combatGameState.stats[0].total
            - afterWinnerDetermination.combatGameState.stats[1].total);

        if (afterWinnerDetermination.postCombatGameState.loser == house && difference <= 2) {
            afterWinnerDetermination.childGameState
                .setChildGameState(new MissandeiAbilityGameState(afterWinnerDetermination.childGameState))
                .firstStart(house);
            return;
        }
        afterWinnerDetermination.childGameState.onHouseCardResolutionFinish(house);
    }
}
