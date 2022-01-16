import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";
import MusteringGameState from "../../westeros-game-state/mustering-game-state/MusteringGameState";

export default class RallyTheMenWesterosCardType extends WesterosCardType {
    execute(westerosGameState: WesterosGameState): void {
        westerosGameState.setChildGameState(new MusteringGameState(westerosGameState)).firstStart(true);
    }
}
