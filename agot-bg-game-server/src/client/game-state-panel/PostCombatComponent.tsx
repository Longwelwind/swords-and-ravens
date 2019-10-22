import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import * as React from "react";
import ChooseCasualtiesGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/choose-casualties-game-state/ChooseCasualtiesGameState";
import ChooseCasualtiesComponent from "./ChooseCasualtiesComponent";
import ChooseRetreatRegionGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/choose-retreat-region-game-state/ChooseRetreatRegionGameState";
import ChooseRetreatRegionComponent from "./ChooseRetreatRegionComponent";
import GameStateComponentProps from "./GameStateComponentProps";
import renderChildGameState from "../utils/renderChildGameState";
import PostCombatGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/PostCombatGameState";
import AfterWinnerDeterminationComponent from "./house-card-abilities/AfterWinnerDeterminationComponent";
import AfterWinnerDeterminationGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/AfterWinnerDeterminationGameState";

@observer
export default class PostCombatComponent extends Component<GameStateComponentProps<PostCombatGameState>> {
    get postCombat(): PostCombatGameState {
        return this.props.gameState;
    }

    render(): ReactNode {
        return (
            <>
                <div>
                    Winner: {this.postCombat.winner.name}
                </div>
                {renderChildGameState(this.props, [
                    [ChooseCasualtiesGameState, ChooseCasualtiesComponent],
                    [ChooseRetreatRegionGameState, ChooseRetreatRegionComponent],
                    [AfterWinnerDeterminationGameState, AfterWinnerDeterminationComponent]
                ])}
            </>
        );
    }
}
