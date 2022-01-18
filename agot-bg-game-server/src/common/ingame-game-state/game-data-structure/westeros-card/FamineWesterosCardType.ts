import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";
import ReconcileArmiesGameState from "../../westeros-game-state/reconcile-armies-game-state/ReconcileArmiesGameState";

export default class FamineWesterosCardType extends WesterosCardType {
    execute(westeros: WesterosGameState): void {
        const houses = westeros.game.houses.values;

        // Reduce the supply level of all houses by 1
        houses.forEach(h =>  {
            h.supplyLevel = Math.max(0, h.supplyLevel - 1);
        });

        westeros.ingame.log({
            type: "supply-adjusted",
            supplies: houses.map(h => [h.id, h.supplyLevel])
        });

        westeros.ingame.entireGame.broadcastToClients({
            type: "supply-adjusted",
            supplies: houses.map(h => [h.id, h.supplyLevel])
        });

        // Check if any house needs to reconcile his armies
        westeros.setChildGameState(new ReconcileArmiesGameState(westeros)).firstStart();
    }
}
