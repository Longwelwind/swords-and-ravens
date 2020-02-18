import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import TheHordeDescendsNightsWatchVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/the-horde-descends-nights-watch-victory-game-state/TheHordeDescendsNightsWatchVictoryGameState";
import PlayerMusteringGameState
    from "../../../common/ingame-game-state/westeros-game-state/mustering-game-state/player-mustering-game-state/PlayerMusteringGameState";
import PlayerMusteringComponent from "../PlayerMusteringComponent";

@observer
export default class TheHordeDescendsNightsWatchVictoryComponent extends Component<GameStateComponentProps<TheHordeDescendsNightsWatchVictoryGameState>> {
    render(): ReactNode {
        return renderChildGameState(this.props, [
            [PlayerMusteringGameState, PlayerMusteringComponent],
        ]);
    }
}
