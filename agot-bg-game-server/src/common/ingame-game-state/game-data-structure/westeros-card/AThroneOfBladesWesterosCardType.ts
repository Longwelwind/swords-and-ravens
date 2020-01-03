import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";
import AThroneOfBladesGameState from "../../westeros-game-state/thrones-of-blades-game-state/AThroneOfBladesGameState";

export default class AThroneOfBladesWesterosCardType extends WesterosCardType {
    execute(westeros: WesterosGameState): void {
        westeros.setChildGameState(new AThroneOfBladesGameState(westeros)).firstStart();
    }
}
