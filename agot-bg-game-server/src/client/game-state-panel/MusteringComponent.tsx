import MusteringGameState
    from "../../common/ingame-game-state/westeros-game-state/mustering-game-state/MusteringGameState";
import {observer} from "mobx-react";
import {Component} from "react";
import PlayerMusteringComponent from "./PlayerMusteringComponent";
import * as React from "react";
import GameStateComponentProps from "./GameStateComponentProps";
import renderChildGameState from "../utils/renderChildGameState";
import PlayerMusteringGameState
    from "../../common/ingame-game-state/westeros-game-state/mustering-game-state/player-mustering-game-state/PlayerMusteringGameState";

@observer
export default class MusteringComponent extends Component<GameStateComponentProps<MusteringGameState>> {
    render(): React.ReactNode {
        return renderChildGameState(this.props, [[PlayerMusteringGameState, PlayerMusteringComponent]]);
    }
}
