import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";
import DarkWingsDarkWordsGameState
    from "../../westeros-game-state/dark-wings-dark-words-game-state/DarkWingsDarkWordsGameState";

export default class DarkWingDarkWordsWesterosCardType extends WesterosCardType {
    execute(westeros: WesterosGameState): void {
        westeros.setChildGameState(new DarkWingsDarkWordsGameState(westeros)).firstStart();
    }
}
