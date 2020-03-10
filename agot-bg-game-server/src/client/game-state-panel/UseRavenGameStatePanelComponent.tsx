import {observer} from "mobx-react";
import UseRavenGameState from "../../common/ingame-game-state/action-game-state/use-raven-game-state/UseRavenGameState";
import ChooseRavenActionGameState
    from "../../common/ingame-game-state/action-game-state/use-raven-game-state/choose-raven-action-game-state/ChooseRavenActionGameState";
import ChooseRavenActionComponent from "./ChooseRavenActionComponent";
import {Component, ReactNode} from "react";
import ReplaceOrderGameState
    from "../../common/ingame-game-state/action-game-state/use-raven-game-state/replace-order-game-state/ReplaceOrderGameState";
import ReplaceOrderComponent from "./ReplaceOrderComponent";
import SeeTopWildlingCardGameState from "../../common/ingame-game-state/action-game-state/use-raven-game-state/see-top-wildling-card-game-state/SeeTopWildlingCardGameState";
import SeeTopWildlingCardComponent from "./SeeTopWildlingCardComponent";
import renderChildGameState from "../utils/renderChildGameState";
import GameStateComponentProps from "./GameStateComponentProps";

@observer
export default class UseRavenGameStatePanelComponent extends Component<GameStateComponentProps<UseRavenGameState>> {
    render(): ReactNode {
        return renderChildGameState(this.props, [
            [ChooseRavenActionGameState, ChooseRavenActionComponent],
            [ReplaceOrderGameState, ReplaceOrderComponent],
            [SeeTopWildlingCardGameState, SeeTopWildlingCardComponent]
        ]);
    }
}
