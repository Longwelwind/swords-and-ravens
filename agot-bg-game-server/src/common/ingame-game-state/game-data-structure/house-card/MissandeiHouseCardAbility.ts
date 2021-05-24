import HouseCardAbility from "./HouseCardAbility";
import AfterWinnerDeterminationGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/AfterWinnerDeterminationGameState";
import House from "../House";
import HouseCard from "./HouseCard";
import MissandeiAbilityGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/missandei-ability-game-state/MissandeiAbilityGameState";

export default class MissandeiHouseCardAbility extends HouseCardAbility {
    afterWinnerDetermination(afterWinnerDetermination: AfterWinnerDeterminationGameState, house: House, _houseCard: HouseCard): void {
        const houseFinalCombatStrength = Math.max(afterWinnerDetermination.combatGameState.getTotalCombatStrength(house), 0);
        const enemyFinalCombatStrength = Math.max(afterWinnerDetermination.combatGameState.getTotalCombatStrength(afterWinnerDetermination.combatGameState.getEnemy(house)), 0);

        const difference = Math.abs(houseFinalCombatStrength-enemyFinalCombatStrength);

        if (afterWinnerDetermination.postCombatGameState.loser == house && difference <= 2) {
            afterWinnerDetermination.childGameState
                .setChildGameState(new MissandeiAbilityGameState(afterWinnerDetermination.childGameState))
                .firstStart(house);
            return;
        }
        afterWinnerDetermination.childGameState.onHouseCardResolutionFinish(house);
    }
}
