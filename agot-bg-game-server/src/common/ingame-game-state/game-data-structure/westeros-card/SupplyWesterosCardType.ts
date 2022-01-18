import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";
import ReconcileArmiesGameState from "../../westeros-game-state/reconcile-armies-game-state/ReconcileArmiesGameState";

export default class SupplyWesterosCardType extends WesterosCardType {
    execute(westeros: WesterosGameState): void {
        westeros.game.updateSupplies();
        // Check if any house needs to reconcile his armies
        westeros.setChildGameState(new ReconcileArmiesGameState(westeros)).firstStart();
    }
}
