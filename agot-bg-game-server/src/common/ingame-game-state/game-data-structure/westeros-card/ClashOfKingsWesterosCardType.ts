import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";
import ClashOfKingsGameState from "../../westeros-game-state/clash-of-kings-game-state/ClashOfKingsGameState";

export default class ClashOfKingsWesterosCardType extends WesterosCardType {
    execute(westeros: WesterosGameState): void {
        westeros.setChildGameState(new ClashOfKingsGameState(westeros)).firstStart();
    }
}
