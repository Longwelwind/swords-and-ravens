import HouseCardAbility from "./HouseCardAbility";
import House from "../House";
import HouseCard from "./HouseCard";
import AfterWinnerDeterminationGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/AfterWinnerDeterminationGameState";
import AlayneStoneAbilityGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/alayne-stone-ability-game-state/AlayneStoneAbilityGameState";
import { alayneStone } from "./houseCardAbilities";

export default class AlayneStoneHouseCardAbility extends HouseCardAbility {
    afterWinnerDetermination(afterWinnerDetermination: AfterWinnerDeterminationGameState, house: House, _houseCard: HouseCard): void {
        if (afterWinnerDetermination.postCombatGameState.winner == house && house.powerTokens >= 2) {
            const capitalOfHouse = afterWinnerDetermination.combatGameState.world.getCapitalOfHouse(house);
            // getController() will return the wrong house when the player regains their capital with the current fight
            // as the attacking army hasn't moved into the attacked region yet. Therefore we need an extra handling.
            if ((capitalOfHouse && capitalOfHouse.getController() == house) ||
                (afterWinnerDetermination.postCombatGameState.combat.defendingRegion == capitalOfHouse)) {
                afterWinnerDetermination.childGameState
                    .setChildGameState(new AlayneStoneAbilityGameState(afterWinnerDetermination.childGameState))
                    .firstStart(house);
                return;
            }
        }

        afterWinnerDetermination.combatGameState.ingameGameState.log({
            type: "house-card-ability-not-used",
            house: house.id,
            houseCard: alayneStone.id
        });
        afterWinnerDetermination.childGameState.onHouseCardResolutionFinish(house);
    }
}
