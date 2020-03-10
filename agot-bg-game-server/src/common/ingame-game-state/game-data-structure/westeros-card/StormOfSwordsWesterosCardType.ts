import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";
import {noDefenseOrder} from "./planning-restriction/planningRestrictions";

export default class StormOfSwordsWesterosCardType extends WesterosCardType {
    execute(westerosGameState: WesterosGameState): void {
        westerosGameState.planningRestrictions.push(noDefenseOrder);
        westerosGameState.onWesterosCardEnd();
    }
}
