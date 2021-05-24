import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import MelisandreAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/melisandre-ability-game-state/MelisandreAbilityGameState";
import PatchfaceAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/patchface-ability-game-state/PatchfaceAbilityGameState";
import AfterCombatHouseCardAbilitiesGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/AfterCombatHouseCardAbilitiesGameState";
import PatchfaceAbilityComponent from "./PatchfaceAbilityComponent";
import MelisandreAbilityComponent from "./MelisandreAbilityComponent";
import JonConningtonAbilityGameState from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/jon-connington-ability-game-state/JonConningtonAbilityGameState";
import JonConningtonAbilityComponent from "./JonConningtonAbilityComponent";
import RobertArrynAbilityGameState from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/robert-arryn-ability-game-state/RobertArrynAbilityGameState";
import RobertArrynAbilityComponent from "./RobertArrynAbilityComponent";

@observer
export default class AfterCombatHouseCardAbilitiesComponent extends Component<GameStateComponentProps<AfterCombatHouseCardAbilitiesGameState>> {
    render(): ReactNode {
        return renderChildGameState({...this.props, gameState: this.props.gameState.childGameState}, [
            [PatchfaceAbilityGameState, PatchfaceAbilityComponent],
            [MelisandreAbilityGameState, MelisandreAbilityComponent],
            [JonConningtonAbilityGameState, JonConningtonAbilityComponent],
            [RobertArrynAbilityGameState, RobertArrynAbilityComponent]
        ]);
    }
}
