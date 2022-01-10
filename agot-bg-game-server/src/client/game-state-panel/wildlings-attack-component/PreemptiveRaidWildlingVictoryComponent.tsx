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
import React from "react";
import { Col } from "react-bootstrap";

@observer
export default class PreemptiveRaidWildlingVictoryComponent extends Component<GameStateComponentProps<PreemptiveRaidWildlingVictoryGameState>> {
    render(): ReactNode {
        return <>
            <Col xs={12} className="text-center">The lowest bidder destroys units or is reduced 2 positions on their highest influence track.</Col>
            {renderChildGameState(this.props, [
                [SimpleChoiceGameState, SimpleChoiceComponent],
                [SelectUnitsGameState, SelectUnitsComponent]
            ])}
        </>;
    }
}
