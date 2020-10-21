import HouseCard from "./HouseCard";
import HouseCardAbility from "./HouseCardAbility";
import House from "../House";
import AfterCombatHouseCardAbilitiesGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/AfterCombatHouseCardAbilitiesGameState";

export default class VarysHouseCardAbility extends HouseCardAbility {

    afterCombat(afterCombat: AfterCombatHouseCardAbilitiesGameState, house: House, _houseCard: HouseCard): void {
        const fiefdomsI = 1;

        const tracker = afterCombat.childGameState.game.getInfluenceTrackByI(fiefdomsI);
        const currentPosition = tracker.indexOf(house);
        // Remove current vassal house from the tracker...
        tracker.splice(currentPosition, 1);

        // ... and put it as first
        tracker.splice(0, 0, house);

        afterCombat.childGameState.game.setInfluenceTrack(fiefdomsI, tracker);

        afterCombat.parentGameState.parentGameState.parentGameState.parentGameState.parentGameState.log({
            type: "varys-used",
            house: house.id
        });

        afterCombat.parentGameState.entireGame.broadcastToClients({
            type: "change-tracker",
            trackerI: fiefdomsI,
            tracker: tracker.map(h => h.id)
        });

        afterCombat.childGameState.onHouseCardResolutionFinish(house);
    }
};