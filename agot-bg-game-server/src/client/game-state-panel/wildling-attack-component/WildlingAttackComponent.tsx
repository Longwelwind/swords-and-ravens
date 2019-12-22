import {observer} from "mobx-react";
import {Component, default as React, ReactNode} from "react";
import WildlingAttackGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildling-attack-game-state/WildlingAttackGameState";
import BiddingGameState from "../../../common/ingame-game-state/westeros-game-state/bidding-game-state/BiddingGameState";
import BiddingComponent from "../BiddingComponent";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import PreemptiveRaidWildlingVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildling-attack-game-state/preemptive-raid-wildling-victory-game-state/PreemptiveRaidWildlingVictoryGameState";
import PreemptiveRaidWildlingVictoryComponent from "./PreemptiveRaidWildlingVictoryComponent";
import renderChildGameState from "../../utils/renderChildGameState";
import GameStateComponentProps from "../GameStateComponentProps";
import CrowKillersWildlingVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildling-attack-game-state/crow-killers-wildling-victory-game-state/CrowKillersWildlingVictoryGameState";
import CrowKillersWildlingVictoryComponent from "./CrowKillersWildlingVictoryComponent";
import CrowKillersNightsWatchVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildling-attack-game-state/crow-killers-nights-watch-victory-game-state/CrowKillersNightsWatchVictoryGameState";
import CrowKillersNigthsWatchVictoryComponent from "./CrowKillersNigthsWatchVictoryComponent";
import {Col, Row} from "react-bootstrap";
import RattleshirtsRaidersWildlingVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildling-attack-game-state/rattleshirts-raiders-wildling-victory-game-state/RattleshirtsRaidersWildlingVictoryGameState";
import RattleshirtsRaidersWildlingVictoryComponent from "./RattleshirtsRaidersWildlingVictoryComponent";
import MassingOnTheMilkwaterWildlingVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildling-attack-game-state/massing-on-the-milkwater-wildling-victory-game-state/MassingOnTheMilkwaterWildlingVictoryGameState";
import MassingOnTheMilkwaterWildlingVictoryComponent from "./MassingOnTheMilkwaterWildlingVictoryComponent";
import AKingBeyondTheWallWildlingVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildling-attack-game-state/a-king-beyond-the-wall-wildling-victory-game-state/AKingBeyondTheWallWildlingVictoryGameState";
import AKingBeyondTheWallWildlingVictoryComponent from "./AKingBeyondTheWallWildlingVictoryComponent";
import AKingBeyondTheWallNightsWatchVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildling-attack-game-state/a-king-beyond-the-wall-nights-watch-victory-game-state/AKingBeyondTheWallNightsWatchVictoryGameState";
import AKingBeyondTheWallNightsWatchVictoryComponent from "./AKingBeyondTheWallNightsWatchVictoryComponent";

@observer
export default class WildlingAttackComponent extends Component<GameStateComponentProps<WildlingAttackGameState>> {
    render(): ReactNode {
        return (
            <Row>
                {this.props.gameState.wildlingCard && (
                    <Col xs={12}>
                        Wildling card: {this.props.gameState.wildlingCard.type.name}
                    </Col>
                )}
                {renderChildGameState<WildlingAttackGameState>(this.props, [
                    [SimpleChoiceGameState, SimpleChoiceComponent],
                    [BiddingGameState, BiddingComponent],
                    [PreemptiveRaidWildlingVictoryGameState, PreemptiveRaidWildlingVictoryComponent],
                    [CrowKillersWildlingVictoryGameState, CrowKillersWildlingVictoryComponent],
                    [CrowKillersNightsWatchVictoryGameState, CrowKillersNigthsWatchVictoryComponent],
                    [RattleshirtsRaidersWildlingVictoryGameState, RattleshirtsRaidersWildlingVictoryComponent],
                    [MassingOnTheMilkwaterWildlingVictoryGameState, MassingOnTheMilkwaterWildlingVictoryComponent],
                    [AKingBeyondTheWallWildlingVictoryGameState, AKingBeyondTheWallWildlingVictoryComponent],
                    [AKingBeyondTheWallNightsWatchVictoryGameState, AKingBeyondTheWallNightsWatchVictoryComponent],
                ])}
            </Row>
        );
    }
}
