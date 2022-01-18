import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";
import ShiftingAmbitionsGameState from "../../westeros-game-state/shifting-ambitions-game-state/ShiftingAmbitionsGameState";

export default class ShiftingAmbitionsWesterosCardType extends WesterosCardType {
    execute(westeros: WesterosGameState): void {
        westeros.setChildGameState(new ShiftingAmbitionsGameState(westeros)).firstStart();
    }
}
