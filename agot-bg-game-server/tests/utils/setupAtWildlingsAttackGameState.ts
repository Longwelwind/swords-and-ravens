import GlobalContext from "./GlobalContext";
import WildlingsAttackGameState
    from "../../src/common/ingame-game-state/westeros-game-state/wildling-attack-game-state/WildlingsAttackGameState";
import {setupAtPlanningGameState, SetupOptions} from "./setupGames";
import BiddingGameState
    from "../../src/common/ingame-game-state/westeros-game-state/bidding-game-state/BiddingGameState";
import PartialRecursive from "../../src/utils/PartialRecursive";

export default function setupAtwildlingsAttackGameState(userSetupOptions: PartialRecursive<SetupOptions>): GlobalContext<BiddingGameState<WildlingsAttackGameState>> {
    return setupAtPlanningGameState(userSetupOptions).execute(globalContext => {
        globalContext.forEachClients((_, planning) => planning.ready());

        // A full turn will pass with nothing happening.
        // At the beginning of the next turn, a wildlings attack should occur
        return globalContext.expectGameState<BiddingGameState<WildlingsAttackGameState>>(BiddingGameState);
    });
}
