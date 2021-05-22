import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import AfterWinnerDeterminationGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/AfterWinnerDeterminationGameState";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import RenlyBaratheonAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/renly-baratheon-ability-game-state/RenlyBaratheonAbilityGameState";
import RenlyBaratheonAbilityComponent from "./RenlyBaratheonAbilityComponent";
import CerseiLannisterAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/cersei-lannister-ability-game-state/CerseiLannisterAbilityGameState";
import CerseiLannisterAbilityComponent from "./CerseiLannisterAbilityComponent";
import JonSnowBaratheonAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/jon-snow-baratheon-ability-game-state/JonSnowBaratheonAbilityGameState";
import JonSnowBaratheonAbilityComponent from "./JonSnowBaratheonAbilityComponent";
import SerIlynPayneAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/ser-ilyn-payne-ability-game-state/SerIlynPayneAbilityGameState";
import SerIlynPayneAbilityComponent from "./SerIlynPayneAbilityComponent";
import SerGerrisDrinkwaterAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/ser-gerris-drinkwater-ability-game-state/SerGerrisDrinkwaterAbilityGameState";
import SerGerrisDrinkwaterAbilityComponent from "./SerGerrisDrinkwaterAbilityComponent";
import ReekAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/reek-ability-game-state/ReekAbilityGameState";
import ReekAbilityComponent from "./ReekAbilityComponent";
import RodrikTheReaderAbilityGameState from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/rodrik-the-reader-ability-game-state/RodrikTheReaderAbilityGameState";
import RodrikTheReaderAbilityComponent from "./RodrikTheReaderAbilityComponent";
import BericDondarrionAbilityComponent from "./BericDondarrionAbilityComponent";
import BericDondarrionAbilityGameState from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/beric-dondarrion-ability-game-state/BericDondarrionAbilityGameState";
import AlayneStoneAbilityGameState from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/alayne-stone-ability-game-state/AlayneStoneAbilityGameState";
import AlayneStoneAbilityComponent from "./AlayneStoneAbilityComponent";
import LysaArrynModAbilityGameState from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/lysa-arryn-mod-game-state/LysaArrynModAbilityGameState";
import LysaArrynModAbilityComponent from "./LysaArrynModAbilityComponent";

@observer
export default class AfterWinnerDeterminationComponent extends Component<GameStateComponentProps<AfterWinnerDeterminationGameState>> {
    render(): ReactNode {
        return renderChildGameState({...this.props, gameState: this.props.gameState.childGameState}, [
            [RenlyBaratheonAbilityGameState, RenlyBaratheonAbilityComponent],
            [CerseiLannisterAbilityGameState, CerseiLannisterAbilityComponent],
            [JonSnowBaratheonAbilityGameState, JonSnowBaratheonAbilityComponent],
            [SerIlynPayneAbilityGameState, SerIlynPayneAbilityComponent],
            [SerGerrisDrinkwaterAbilityGameState, SerGerrisDrinkwaterAbilityComponent],
            [ReekAbilityGameState, ReekAbilityComponent],
            [RodrikTheReaderAbilityGameState, RodrikTheReaderAbilityComponent],
            [BericDondarrionAbilityGameState, BericDondarrionAbilityComponent],
            [AlayneStoneAbilityGameState, AlayneStoneAbilityComponent],
            [LysaArrynModAbilityGameState, LysaArrynModAbilityComponent]
        ]);
    }
}
