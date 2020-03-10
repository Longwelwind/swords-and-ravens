import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import PatchfaceAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/patchface-ability-game-state/PatchfaceAbilityGameState";
import AfterCombatHouseCardAbilitiesGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/AfterCombatHouseCardAbilitiesGameState";
import PatchfaceAbilityComponent from "./PatchfaceAbilityComponent";

@observer
export default class AfterCombatHouseCardAbilitiesComponent extends Component<GameStateComponentProps<AfterCombatHouseCardAbilitiesGameState>> {
    render(): ReactNode {
        return renderChildGameState({...this.props, gameState: this.props.gameState.childGameState}, [
            [PatchfaceAbilityGameState, PatchfaceAbilityComponent]
        ]);
    }
}
