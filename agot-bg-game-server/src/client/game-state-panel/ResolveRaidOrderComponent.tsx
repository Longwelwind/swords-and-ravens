import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "./GameStateComponentProps";
import ResolveRaidOrderGameState
    from "../../common/ingame-game-state/action-game-state/resolve-raid-order-game-state/ResolveRaidOrderGameState";
import renderChildGameState from "../utils/renderChildGameState";
import ResolveSingleRaidOrderGameState
    from "../../common/ingame-game-state/action-game-state/resolve-raid-order-game-state/resolve-single-raid-order-game-state/ResolveSingleRaidOrderGameState";
import ResolveSingleRaidOrderComponent from "./ResolveSingleRaidOrderComponent";

@observer
export default class ResolveRaidOrderComponent extends Component<GameStateComponentProps<ResolveRaidOrderGameState>> {
    render(): ReactNode {
        return renderChildGameState(this.props, [[ResolveSingleRaidOrderGameState, ResolveSingleRaidOrderComponent]]);
    }
}
