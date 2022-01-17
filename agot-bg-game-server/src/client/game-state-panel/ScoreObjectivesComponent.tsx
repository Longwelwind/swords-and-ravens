import { Component, ReactNode } from "react";
import { observer } from "mobx-react";
import renderChildGameState from "../utils/renderChildGameState";
import GameStateComponentProps from "./GameStateComponentProps";
import ScoreObjectivesGameState from "../../common/ingame-game-state/action-game-state/score-objectives-game-state/ScoreObjectivesGameState";
import ScoreSpecialObjectivesGameState from "../../common/ingame-game-state/action-game-state/score-objectives-game-state/score-special-objectives-game-state/ScoreSpecialObjectivesGameState";
import ScoreOtherObjectivesGameState from "../../common/ingame-game-state/action-game-state/score-objectives-game-state/score-other-objectives-game-state/ScoreOtherObjectivesGameState";
import ScoreSpecialObjectivesComponent from "./ScoreSpecialObjectivesComponent";
import ScoreOtherObjectivesComponent from "./ScoreOtherObjectivesComponent";

@observer
export default class ScoreObjectivesComponent extends Component<GameStateComponentProps<ScoreObjectivesGameState>> {
    render(): ReactNode {
        return renderChildGameState(this.props, [
            [ScoreSpecialObjectivesGameState, ScoreSpecialObjectivesComponent],
            [ScoreOtherObjectivesGameState, ScoreOtherObjectivesComponent]
        ]);
    }
}
