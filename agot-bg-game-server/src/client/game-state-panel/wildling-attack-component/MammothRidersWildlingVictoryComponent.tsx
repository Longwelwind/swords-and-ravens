import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import SelectUnitsGameState from "../../../common/ingame-game-state/select-units-game-state/SelectUnitsGameState";
import SelectUnitsComponent from "../SelectUnitsComponent";
import React from "react";
import MammothRidersWildlingVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/mammoth-riders-wildling-victory-game-state/MammothRidersWildlingVictoryGameState";

@observer
export default class MammothRidersWildlingVictoryComponent extends Component<GameStateComponentProps<MammothRidersWildlingVictoryGameState>> {
    render(): ReactNode {
        return (
            <>
                {renderChildGameState(this.props, [
                    [SelectUnitsGameState, SelectUnitsComponent]
                ])}
            </>
        );
    }
}
