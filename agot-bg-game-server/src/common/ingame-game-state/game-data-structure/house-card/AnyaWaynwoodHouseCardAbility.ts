import HouseCardAbility from "./HouseCardAbility";
import AfterWinnerDeterminationGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/AfterWinnerDeterminationGameState";
import House from "../House";
import HouseCard from "./HouseCard";

export default class AnyaWaynwoodHouseCardAbility extends HouseCardAbility {
    afterWinnerDetermination(afterWinnerDetermination: AfterWinnerDeterminationGameState, house: House, _houseCard: HouseCard): void {
        if (afterWinnerDetermination.postCombatGameState.winner == house) {
            const houses = [house];
            houses.push(...afterWinnerDetermination.combatGameState.supporters.entries.filter(
                ([supporter, supported]) => supporter != house && supported == house)
                .map(([supporter, _supported]) => supporter));

            const result: [string, number][] = [];

            houses.forEach(h => {
                const powerTokensGained = afterWinnerDetermination.combatGameState.ingameGameState.changePowerTokens(h, 3);
                result.push([h.id, powerTokensGained]);
            });

            afterWinnerDetermination.combatGameState.ingameGameState.log({
                type: "anya-waynwood-power-tokens-gained",
                gains: result
            });
        }
        afterWinnerDetermination.childGameState.onHouseCardResolutionFinish(house);
    }
};
