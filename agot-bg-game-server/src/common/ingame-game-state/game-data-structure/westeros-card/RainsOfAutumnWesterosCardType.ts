import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";
import {noMarchPlusOneOrder} from "./planning-restriction/planningRestrictions";

export default class RainsOfAutumnWesterosCardType extends WesterosCardType {
    execute(westerosGameState: WesterosGameState): void {
        westerosGameState.planningRestrictions.push(noMarchPlusOneOrder);
        westerosGameState.onWesterosCardEnd();
    }
}
