import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";

export default class DenseFogWesterosCardType extends WesterosCardType {
    execute(westeros: WesterosGameState): void {
        westeros.ingame.unitVisibilityRange = 0;
        westeros.ingame.updateVisibleRegions(true);
        westeros.onWesterosCardEnd();
    }
}