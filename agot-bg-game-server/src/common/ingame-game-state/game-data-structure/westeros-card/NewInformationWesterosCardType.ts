import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";
import NewInformationGameState from "../../westeros-game-state/new-information-game-state/NewInformationGameState";

export default class NewInformationWesterosCardType extends WesterosCardType {
    execute(westeros: WesterosGameState): void {
        westeros.setChildGameState(new NewInformationGameState(westeros)).firstStart();
    }
}
