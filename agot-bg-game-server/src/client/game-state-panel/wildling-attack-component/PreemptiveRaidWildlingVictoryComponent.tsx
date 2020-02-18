import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import PreemptiveRaidWildlingVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/preemptive-raid-wildling-victory-game-state/PreemptiveRaidWildlingVictoryGameState";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import SelectUnitsGameState from "../../../common/ingame-game-state/select-units-game-state/SelectUnitsGameState";
import SelectUnitsComponent from "../SelectUnitsComponent";

@observer
export default class PreemptiveRaidWildlingVictoryComponent extends Component<GameStateComponentProps<PreemptiveRaidWildlingVictoryGameState>> {
    render(): ReactNode {
        return renderChildGameState(this.props, [
            [SimpleChoiceGameState, SimpleChoiceComponent],
            [SelectUnitsGameState, SelectUnitsComponent]
        ]);
    }
}
