import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";
import {noRaidOrder} from "./planning-restriction/planningRestrictions";

export default class SeaOfStormsWesterosCardType extends WesterosCardType {
    execute(westeros: WesterosGameState): void {
        westeros.planningRestrictions.push(noRaidOrder);
        westeros.onWesterosCardEnd();
    }
}
