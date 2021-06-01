import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import * as React from "react";
import ChooseCasualtiesGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/choose-casualties-game-state/ChooseCasualtiesGameState";
import ChooseCasualtiesComponent from "./ChooseCasualtiesComponent";
import GameStateComponentProps from "./GameStateComponentProps";
import renderChildGameState from "../utils/renderChildGameState";
import PostCombatGameState from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/PostCombatGameState";
import AfterWinnerDeterminationComponent from "./house-card-abilities/AfterWinnerDeterminationComponent";
import AfterWinnerDeterminationGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/AfterWinnerDeterminationGameState";
import AfterCombatHouseCardAbilitiesGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/AfterCombatHouseCardAbilitiesGameState";
import AfterCombatHouseCardAbilitiesComponent from "./house-card-abilities/AfterCombatHouseCardAbilitiesComponent";
import ResolveRetreatGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/resolve-retreat-game-state/ResolveRetreatGameState";
import ResolveRetreatComponent from "./ResolveRetreatComponent";

@observer
export default class PostCombatComponent extends Component<GameStateComponentProps<PostCombatGameState>> {
    get postCombat(): PostCombatGameState {
        return this.props.gameState;
    }

    render(): ReactNode {
        return (
            <>
                {renderChildGameState(this.props, [
                    [ChooseCasualtiesGameState, ChooseCasualtiesComponent],
                    [ResolveRetreatGameState, ResolveRetreatComponent],
                    [AfterWinnerDeterminationGameState, AfterWinnerDeterminationComponent],
                    [AfterCombatHouseCardAbilitiesGameState, AfterCombatHouseCardAbilitiesComponent]
                ])}
            </>
        );
    }
}
