import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";
import PutToTheSwordGameState from "../../westeros-game-state/put-to-the-swords-game-state/PutToTheSwordGameState";

export default class PutToTheSwordWesterosCardType extends WesterosCardType {
    execute(westeros: WesterosGameState): void {
        westeros.setChildGameState(new PutToTheSwordGameState(westeros)).firstStart();
    }
}
