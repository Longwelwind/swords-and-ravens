import {observer} from "mobx-react";
import GameStateComponentProps from "../GameStateComponentProps";
import {Component, ReactNode} from "react";
import ImmediatelyHouseCardAbilitiesResolutionGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/ImmediatelyHouseCardAbilitiesResolutionGameState";
import renderChildGameState from "../../utils/renderChildGameState";
import QueenOfThornsAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/queen-of-thorns-ability-game-state/QueenOfThornsAbilityGameState";
import QueenOfThornsAbilityComponent from "./QueenOfThornsAbilityComponent";
import DoranMartellAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/doran-martell-ability-game-state/DoranMartellAbilityGameState";
import DoranMartellAbilityComponent from "./DoranMartellAbilityComponent";
import AeronDamphairAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/aeron-damphair-ability-game-state/AeronDamphairAbilityGameState";
import AeronDamphairAbilityComponent from "./AeronDamphairAbilityComponent";
import MaceTyrellAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/mace-tyrell-ability-game-state/MaceTyrellAbilityGameState";
import MaceTyrellAbilityComponent from "./MaceTyrellAbilityComponent";
import AeronDamphairDwDAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/aeron-damphair-dwd-ability-game-state/AeronDamphairDwDAbilityGameState";
import AeronDamphairDwDAbilityComponent from "./AeronDamphairDwDAbilityComponent";
import QyburnAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/qyburn-ability-game-state/QyburnAbilityGameState";
import QyburnAbilityComponent from "./QyburnAbilityComponent";

@observer
export default class ImmediatelyHouseCardAbilitiesResolutionComponent extends Component<GameStateComponentProps<ImmediatelyHouseCardAbilitiesResolutionGameState>> {
    render(): ReactNode {
        return renderChildGameState({...this.props, gameState: this.props.gameState.childGameState}, [
            [QueenOfThornsAbilityGameState, QueenOfThornsAbilityComponent],
            [DoranMartellAbilityGameState, DoranMartellAbilityComponent],
            [AeronDamphairAbilityGameState, AeronDamphairAbilityComponent],
            [MaceTyrellAbilityGameState, MaceTyrellAbilityComponent],
            [AeronDamphairDwDAbilityGameState, AeronDamphairDwDAbilityComponent],
            [QyburnAbilityGameState, QyburnAbilityComponent]
        ]);
    }
}
