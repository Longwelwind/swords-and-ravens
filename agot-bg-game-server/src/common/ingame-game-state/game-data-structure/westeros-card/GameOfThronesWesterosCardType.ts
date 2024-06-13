import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";

export default class GameOfThronesWesterosCardType extends WesterosCardType {
    execute(westeros: WesterosGameState): void {
        const gains = westeros.ingame.calculatePossibleGainsForGameOfThrones();

        gains.entries.forEach(([house, gain]) => {
            const delta = westeros.ingame.changePowerTokens(house, gain);
            gains.set(house, delta);
        });

        westeros.ingame.log({
            type: "game-of-thrones-power-tokens-gained",
            gains: gains.entries.map(([house, gain]) => [house.id, gain])
        });

        westeros.onWesterosCardEnd();
    }
}
