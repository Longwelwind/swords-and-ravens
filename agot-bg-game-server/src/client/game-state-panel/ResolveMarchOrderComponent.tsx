import {observer} from "mobx-react";
import ResolveMarchOrderGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/ResolveMarchOrderGameState";
import {Component, ReactNode} from "react";
import * as React from "react";
import ResolveSingleMarchOrderGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/resolve-single-march-order-game-state/ResolveSingleMarchOrderGameState";
import ResolveSingleMarchOrderComponent from "./ResolveSingleMarchOrderComponent";
import CombatGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import CombatComponent from "./CombatComponent";
import GameStateComponentProps from "./GameStateComponentProps";
import renderChildGameState from "../utils/renderChildGameState";

@observer
export default class ResolveMarchOrderComponent extends Component<GameStateComponentProps<ResolveMarchOrderGameState>> {
    render(): ReactNode {
        return renderChildGameState(this.props, [
            [ResolveSingleMarchOrderGameState, ResolveSingleMarchOrderComponent],
            [CombatGameState, CombatComponent]
        ]);
    }
}
