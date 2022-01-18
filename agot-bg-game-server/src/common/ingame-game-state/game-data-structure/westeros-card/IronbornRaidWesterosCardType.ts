import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";

export default class IronbornRaidWesterosCardType extends WesterosCardType {
    execute(westeros: WesterosGameState): void {
        const houses = westeros.game.houses.values;

        // Reduce victory track position by one for houses with at least 2 scored objectives
        houses.forEach(h =>  {
            if (h.completedObjectives.length >= 2) {
                h.victoryPoints = Math.max(0, h.victoryPoints - 1);
                westeros.ingame.log({
                    type: "ironborn-raid",
                    house: h.id
                });
            }
        });

        westeros.ingame.broadcastObjectives();

        westeros.onWesterosCardEnd();
    }
}
