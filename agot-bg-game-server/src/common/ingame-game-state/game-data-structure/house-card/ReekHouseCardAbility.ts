import HouseCardAbility from "./HouseCardAbility";
import ImmediatelyHouseCardAbilitiesResolutionGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/ImmediatelyHouseCardAbilitiesResolutionGameState";
import House from "../House";
import HouseCard, {HouseCardState} from "./HouseCard";
import AfterWinnerDeterminationGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/AfterWinnerDeterminationGameState";
import ReekAbilityGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/reek-ability-game-state/ReekAbilityGameState";

export default class ReekHouseCardAbility extends HouseCardAbility {
    immediatelyResolution(immediately: ImmediatelyHouseCardAbilitiesResolutionGameState, house: House, _houseCard: HouseCard): void {
        const houseCardWithThreeStrength = house.houseCards.values.filter(hc => hc.combatStrength == 3);
        if (houseCardWithThreeStrength.length == 1 && houseCardWithThreeStrength[0].state == HouseCardState.USED) {
            houseCardWithThreeStrength[0].state = HouseCardState.AVAILABLE;
            immediately.entireGame.broadcastToClients({
                type: "change-state-house-card",
                houseId: house.id,
                cardIds: [houseCardWithThreeStrength[0].id],
                state: HouseCardState.AVAILABLE
            });

            immediately.parentGameState.ingameGameState.log({
                type: "reek-returned-ramsay",
                house: house.id,
                returnedCardId: houseCardWithThreeStrength[0].id
            });
        }
        immediately.childGameState.onHouseCardResolutionFinish(house);
    }

    afterWinnerDetermination(afterWinnerDetermination: AfterWinnerDeterminationGameState, house: House, _houseCard: HouseCard): void {
        if (afterWinnerDetermination.postCombatGameState.loser == house) {
            afterWinnerDetermination.childGameState
                .setChildGameState(new ReekAbilityGameState(afterWinnerDetermination.childGameState))
                .firstStart(house);
            return;
        }

        afterWinnerDetermination.childGameState.onHouseCardResolutionFinish(house);
    }
}
