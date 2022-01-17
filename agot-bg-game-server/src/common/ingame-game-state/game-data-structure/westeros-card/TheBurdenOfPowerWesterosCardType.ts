import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";
import TheBurdenOfPowerGameState from "../../westeros-game-state/the-burden-of-power-game-state/TheBurdenOfPowerGameState";

export default class TheBurdenOfPowerWesterosCardType extends WesterosCardType {
    execute(westeros: WesterosGameState): void {
        westeros.setChildGameState(new TheBurdenOfPowerGameState(westeros)).firstStart();
    }
}
