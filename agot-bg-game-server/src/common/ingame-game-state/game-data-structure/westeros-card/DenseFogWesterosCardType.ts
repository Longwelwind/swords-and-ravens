import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";
import {denseFog} from "./planning-restriction/planningRestrictions";

export default class DenseFogWesterosCardType extends WesterosCardType {
    execute(westeros: WesterosGameState): void {
        westeros.planningRestrictions.push(denseFog);
        westeros.onWesterosCardEnd();
    }
}