import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import AfterWinnerDeterminationGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/AfterWinnerDeterminationGameState";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import RenlyBaratheonAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/renly-baratheon-ability-game-state/RenlyBaratheonAbilityGameState";
import RenlyBaratheonAbilityComponent from "./RenlyBaratheonAbilityComponent";

@observer
export default class AfterWinnerDeterminationComponent extends Component<GameStateComponentProps<AfterWinnerDeterminationGameState>> {
    render(): ReactNode {
        return renderChildGameState({...this.props, gameState: this.props.gameState.childGameState}, [
            [RenlyBaratheonAbilityGameState, RenlyBaratheonAbilityComponent]
        ]);
    }
}
