import { Component, ReactNode } from "react";
import { observer } from "mobx-react";
import GameStateComponentProps from "./GameStateComponentProps";
import DraftGameState from "../../common/ingame-game-state/draft-game-state/DraftGameState";
import renderChildGameState from "../utils/renderChildGameState";
import DraftMapGameState from "../../common/ingame-game-state/draft-game-state/draft-map-game-state/DraftMapGameState";
import DraftMapComponent from "./DraftMapComponent";
import AgreeOnGameStartGameState from "../../common/ingame-game-state/draft-game-state/agree-on-game-start-game-state/AgreeOnGameStartGameState";
import AgreeOnGameStartComponent from "./AgreeOnGameStartComponent";


@observer
export default class DraftComponent extends Component<GameStateComponentProps<DraftGameState>> {
    render(): ReactNode {
        return renderChildGameState(this.props, [
            [DraftMapGameState, DraftMapComponent],
            [AgreeOnGameStartGameState, AgreeOnGameStartComponent]
        ]);
    }
}
