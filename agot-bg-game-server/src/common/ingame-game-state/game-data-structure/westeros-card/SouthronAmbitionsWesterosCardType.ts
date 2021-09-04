import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";
import WesterosDeck4GameState from "../../westeros-game-state/westeros-deck-4-game-state/WesterosDeck4GameState";

export default class SouthronAmbitionsWesterosCardType extends WesterosCardType {
    execute(westerosGameState: WesterosGameState): void {
        this.loyaltyTokenRegions.forEach(rid => {
            const region = westerosGameState.world.regions.get(rid);
            westerosGameState.placeLoyaltyToken(region);
        });

        if (this.choosableLoyaltyTokenRegions.length > 0 && westerosGameState.game.targaryen) {
            westerosGameState.setChildGameState(new WesterosDeck4GameState(westerosGameState)).firstStart(this);
        } else {
            westerosGameState.onWesterosCardEnd();
        }
    }
}
