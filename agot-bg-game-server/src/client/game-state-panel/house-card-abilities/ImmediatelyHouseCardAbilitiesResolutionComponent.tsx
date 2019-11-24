import {observer} from "mobx-react";
import GameStateComponentProps from "../GameStateComponentProps";
import {Component, ReactNode} from "react";
import ImmediatelyHouseCardAbilitiesResolutionGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/ImmediatelyHouseCardAbilitiesResolutionGameState";
import renderChildGameState from "../../utils/renderChildGameState";
import QueenOfThornsAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/queen-of-thorns-ability-game-state/QueenOfThornsAbilityGameState";
import QueenOfThornsAbilityComponent from "./QueenOfThornsAbilityComponent";


@observer
export default class ImmediatelyHouseCardAbilitiesResolutionComponent extends Component<GameStateComponentProps<ImmediatelyHouseCardAbilitiesResolutionGameState>> {
    render(): ReactNode {
        return renderChildGameState({...this.props, gameState: this.props.gameState.childGameState}, [
            [QueenOfThornsAbilityGameState, QueenOfThornsAbilityComponent]
        ]);
    }
}
