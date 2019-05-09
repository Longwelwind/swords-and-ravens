import {observer} from "mobx-react";
import ClashOfKingsGameState
    from "../../common/ingame-game-state/westeros-game-state/clash-of-kings-game-state/ClashOfKingsGameState";
import {Component} from "react";
import BiddingGameState from "../../common/ingame-game-state/westeros-game-state/bidding-game-state/BiddingGameState";
import BiddingComponent from "./BiddingComponent";
import ResolveTiesGameState
    from "../../common/ingame-game-state/westeros-game-state/clash-of-kings-game-state/resolve-ties-game-state/ResolveTiesGameState";
import * as React from "react";
import ResolveTiesComponent from "./ResolveTiesComponent";
import renderChildGameState from "../utils/renderChildGameState";
import GameStateComponentProps from "./GameStateComponentProps";

@observer
export default class ClashOfKingsComponent extends Component<GameStateComponentProps<ClashOfKingsGameState>> {
    render() {
        return renderChildGameState(this.props, [
            [BiddingGameState, BiddingComponent],
            [ResolveTiesGameState, ResolveTiesComponent]
        ]);
    }
}
