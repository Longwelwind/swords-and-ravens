import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";
import {noConsolidatePowerOrder} from "./planning-restriction/planningRestrictions";

export default class FeastForCrowsWesterosCardType extends WesterosCardType {
    execute(westerosGameState: WesterosGameState): void {
        westerosGameState.planningRestrictions.push(noConsolidatePowerOrder);
        westerosGameState.onWesterosCardEnd();
    }
}
