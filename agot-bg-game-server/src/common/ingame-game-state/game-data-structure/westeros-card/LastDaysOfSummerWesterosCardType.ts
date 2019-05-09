import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";

export default class LastDaysOfSummerWesterosCardType extends WesterosCardType {
    execute(westerosGameState: WesterosGameState): void {
        westerosGameState.onWesterosCardEnd();
    }
}
