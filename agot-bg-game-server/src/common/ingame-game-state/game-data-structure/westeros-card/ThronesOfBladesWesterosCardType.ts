import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";
import ThronesOfBladesGameState from "../../westeros-game-state/thrones-of-blades-game-state/ThronesOfBladesGameState";

export default class ThronesOfBladesWesterosCardType extends WesterosCardType {
    execute(westeros: WesterosGameState): void {
        westeros.setChildGameState(new ThronesOfBladesGameState(westeros)).firstStart();
    }
}
