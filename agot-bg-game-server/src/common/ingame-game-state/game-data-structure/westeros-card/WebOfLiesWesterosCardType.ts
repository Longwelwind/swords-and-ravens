import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";
import {noSupportOrder} from "./planning-restriction/planningRestrictions";

export default class WebOfLiesWesterosCardType extends WesterosCardType {
    execute(westeros: WesterosGameState): void {
        westeros.planningRestrictions.push(noSupportOrder);
        westeros.onWesterosCardEnd();
    }
}
