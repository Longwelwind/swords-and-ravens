import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import RattleshirtsRaidersWildlingVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/rattleshirts-raiders-wildling-victory-game-state/RattleshirtsRaidersWildlingVictoryGameState";
import ReconcileArmiesGameState
    from "../../../common/ingame-game-state/westeros-game-state/reconcile-armies-game-state/ReconcileArmiesGameState";
import ReconcileArmiesComponent from "../ReconcileArmiesComponent";

@observer
export default class RattleshirtsRaidersWildlingVictoryComponent extends Component<GameStateComponentProps<RattleshirtsRaidersWildlingVictoryGameState>> {
    render(): ReactNode {
        return renderChildGameState(this.props, [
            [ReconcileArmiesGameState, ReconcileArmiesComponent],
        ]);
    }
}
