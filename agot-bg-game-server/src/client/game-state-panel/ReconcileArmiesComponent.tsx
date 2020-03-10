import ReconcileArmiesGameState
    from "../../common/ingame-game-state/westeros-game-state/reconcile-armies-game-state/ReconcileArmiesGameState";
import {Component, ReactNode} from "react";
import PlayerReconcileArmiesComponent from "./PlayerReconcileArmiesComponent";
import {observer} from "mobx-react";
import renderChildGameState from "../utils/renderChildGameState";
import PlayerReconcileArmiesGameState
    from "../../common/ingame-game-state/westeros-game-state/reconcile-armies-game-state/player-reconcile-armies-game-state/PlayerReconcileArmiesGameState";
import GameStateComponentProps from "./GameStateComponentProps";

@observer
export default class ReconcileArmiesComponent extends Component<GameStateComponentProps<ReconcileArmiesGameState<any>>> {
    render(): ReactNode {
        return renderChildGameState(this.props, [[PlayerReconcileArmiesGameState, PlayerReconcileArmiesComponent]]);
    }
}
