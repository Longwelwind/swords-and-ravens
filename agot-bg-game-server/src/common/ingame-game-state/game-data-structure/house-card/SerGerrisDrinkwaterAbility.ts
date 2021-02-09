import HouseCardAbility from "./HouseCardAbility";
import AfterWinnerDeterminationGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/AfterWinnerDeterminationGameState";
import House from "../House";
import HouseCard from "./HouseCard";
import SerGerrisDrinkwaterAbilityGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/ser-gerris-drinkwater-ability-game-state/SerGerrisDrinkwaterAbilityGameState";

export default class SerGerrisDrinkwaterAbility extends HouseCardAbility {

    afterWinnerDetermination(afterWinnerDetermination: AfterWinnerDeterminationGameState, house: House, _houseCard: HouseCard): void {
        if (afterWinnerDetermination.postCombatGameState.winner == house) {
            afterWinnerDetermination.childGameState
                .setChildGameState(new SerGerrisDrinkwaterAbilityGameState(afterWinnerDetermination.childGameState))
                .firstStart(house);
            return;
        }

        afterWinnerDetermination.childGameState.onHouseCardResolutionFinish(house);
    }
}
