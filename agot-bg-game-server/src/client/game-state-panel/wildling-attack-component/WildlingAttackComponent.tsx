import {observer} from "mobx-react";
import {Component, default as React} from "react";
import WildlingAttackGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildling-attack-game-state/WildlingAttackGameState";
import BiddingGameState from "../../../common/ingame-game-state/westeros-game-state/bidding-game-state/BiddingGameState";
import BiddingComponent from "../BiddingComponent";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import PreemptiveRaidWildlingVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildling-attack-game-state/preemptive-raid-wildling-victory-game-state/PreemptiveRaidWildlingVictoryGameState";
import PreemptiveRaidWildlingVictoryComponent from "./PreemptiveRaidWildlingVictoryComponent";
import renderChildGameState from "../../utils/renderChildGameState";
import GameStateComponentProps from "../GameStateComponentProps";

@observer
export default class WildlingAttackComponent extends Component<GameStateComponentProps<WildlingAttackGameState>> {
    render() {
        return (
            <>
                {this.props.gameState.wildlingCard && (
                    <div>
                        Wildling card: {this.props.gameState.wildlingCard.type.name}
                    </div>
                )}
                {renderChildGameState<WildlingAttackGameState>(this.props, [
                    [SimpleChoiceGameState, SimpleChoiceComponent],
                    [BiddingGameState, BiddingComponent],
                    [PreemptiveRaidWildlingVictoryGameState, PreemptiveRaidWildlingVictoryComponent],
                ])}
            </>
        );
    }
}
