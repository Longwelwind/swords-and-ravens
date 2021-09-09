import HouseCardAbility from "./HouseCardAbility";
import AfterCombatHouseCardAbilitiesGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/AfterCombatHouseCardAbilitiesGameState";
import HouseCard from "./HouseCard";
import House from "../House";
import _ from "lodash";

export default class VarysHouseCardAbility extends HouseCardAbility {
    afterCombat(afterCombat: AfterCombatHouseCardAbilitiesGameState, house: House, _houseCard: HouseCard): void {
        // Put the vassal at the top of the influence track
        const fiefdoms = _.without(afterCombat.game.fiefdomsTrack, house);
        fiefdoms.unshift(house);
        afterCombat.combatGameState.ingameGameState.setInfluenceTrack(1, fiefdoms);

        afterCombat.combatGameState.ingameGameState.log({
            type: "varys-used",
            house: house.id
        });

        afterCombat.childGameState.onHouseCardResolutionFinish(house);
    }
}