import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";
import ReconcileArmiesGameState from "../../westeros-game-state/reconcile-armies-game-state/ReconcileArmiesGameState";

export default class SupplyWesterosCardType extends WesterosCardType {
    execute(westeros: WesterosGameState): void {
        // Refresh the supply level of all houses
        westeros.game.houses.values.forEach(h =>  {
            h.supplyLevel = westeros.game.getControlledSupplyIcons(h);
        });

        westeros.ingame.log({
            type: "supply-adjusted",
            supplies: westeros.game.houses.values.map(h => [h.id, h.supplyLevel])
        });

        westeros.entireGame.broadcastToClients({
            type: "supply-adjusted",
            supplies: westeros.game.houses.values.map(h => [h.id, h.supplyLevel])
        });

        // Check if any house needs to reconcile his armies
        westeros.setChildGameState(new ReconcileArmiesGameState(westeros)).firstStart();
    }
}
