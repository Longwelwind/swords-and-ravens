import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";

export default class WateringTheSeedWesterosCardType extends WesterosCardType {
    execute(westerosGameState: WesterosGameState): void {
        this.loyaltyTokenRegions.forEach(rid => {
            const region = westerosGameState.world.regions.get(rid);
            westerosGameState.placeLoyaltyToken(region);
        });

        westerosGameState.onWesterosCardEnd();
    }
}
