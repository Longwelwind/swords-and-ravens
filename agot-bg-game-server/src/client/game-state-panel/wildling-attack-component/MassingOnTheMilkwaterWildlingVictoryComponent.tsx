import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import MassingOnTheMilkwaterWildlingVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildling-attack-game-state/massing-on-the-milkwater-wildling-victory-game-state/MassingOnTheMilkwaterWildlingVictoryGameState";
import SelectHouseCardComponent from "../SelectHouseCardComponent";
import SelectHouseCardGameState
    from "../../../common/ingame-game-state/select-house-card-game-state/SelectHouseCardGameState";

@observer
export default class MassingOnTheMilkwaterWildlingVictoryComponent extends Component<GameStateComponentProps<MassingOnTheMilkwaterWildlingVictoryGameState>> {
    render(): ReactNode {
        return (
            <>
                {renderChildGameState(this.props, [
                    [SelectHouseCardGameState, SelectHouseCardComponent]
                ])}
            </>
        );
    }
}
