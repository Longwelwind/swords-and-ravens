import {observer} from "mobx-react";
import GameStateComponentProps from "../GameStateComponentProps";
import {Component, ReactNode} from "react";
import renderChildGameState from "../../utils/renderChildGameState";
import TyrionLannisterAbilityComponent from "./TyrionLannisterAbilityComponent";
import TyrionLannisterAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/cancel-house-card-abilities-game-state/tyrion-lannister-ability-game-state/TyrionLannisterAbilityGameState";
import CancelHouseCardAbilitiesGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/cancel-house-card-abilities-game-state/CancelHouseCardAbilitiesGameState";
import React from "react";


@observer
export default class CancelHouseCardAbilitiesComponent extends Component<GameStateComponentProps<CancelHouseCardAbilitiesGameState>> {
    render(): ReactNode {
        return this.props.gameState.combatGameState.stats.length > 0 ? <></> :
            renderChildGameState({...this.props, gameState: this.props.gameState.childGameState}, [
            [TyrionLannisterAbilityGameState, TyrionLannisterAbilityComponent]
        ]);
    }
}
