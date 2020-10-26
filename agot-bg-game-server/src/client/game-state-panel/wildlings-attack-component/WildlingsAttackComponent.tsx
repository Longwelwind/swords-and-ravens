import {observer} from "mobx-react";
import {Component, default as React, ReactNode} from "react";
import WildlingsAttackGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/WildlingsAttackGameState";
import BiddingGameState from "../../../common/ingame-game-state/westeros-game-state/bidding-game-state/BiddingGameState";
import BiddingComponent from "../BiddingComponent";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import PreemptiveRaidWildlingVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/preemptive-raid-wildling-victory-game-state/PreemptiveRaidWildlingVictoryGameState";
import PreemptiveRaidWildlingVictoryComponent from "./PreemptiveRaidWildlingVictoryComponent";
import renderChildGameState from "../../utils/renderChildGameState";
import GameStateComponentProps from "../GameStateComponentProps";
import CrowKillersWildlingVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/crow-killers-wildling-victory-game-state/CrowKillersWildlingVictoryGameState";
import CrowKillersWildlingVictoryComponent from "./CrowKillersWildlingVictoryComponent";
import CrowKillersNightsWatchVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/crow-killers-nights-watch-victory-game-state/CrowKillersNightsWatchVictoryGameState";
import CrowKillersNigthsWatchVictoryComponent from "./CrowKillersNigthsWatchVictoryComponent";
import {Col, Row} from "react-bootstrap";
import RattleshirtsRaidersWildlingVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/rattleshirts-raiders-wildling-victory-game-state/RattleshirtsRaidersWildlingVictoryGameState";
import RattleshirtsRaidersWildlingVictoryComponent from "./RattleshirtsRaidersWildlingVictoryComponent";
import MassingOnTheMilkwaterWildlingVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/massing-on-the-milkwater-wildling-victory-game-state/MassingOnTheMilkwaterWildlingVictoryGameState";
import MassingOnTheMilkwaterWildlingVictoryComponent from "./MassingOnTheMilkwaterWildlingVictoryComponent";
import AKingBeyondTheWallWildlingVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/a-king-beyond-the-wall-wildling-victory-game-state/AKingBeyondTheWallWildlingVictoryGameState";
import AKingBeyondTheWallWildlingVictoryComponent from "./AKingBeyondTheWallWildlingVictoryComponent";
import AKingBeyondTheWallNightsWatchVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/a-king-beyond-the-wall-nights-watch-victory-game-state/AKingBeyondTheWallNightsWatchVictoryGameState";
import AKingBeyondTheWallNightsWatchVictoryComponent from "./AKingBeyondTheWallNightsWatchVictoryComponent";
import MammothRidersWildlingVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/mammoth-riders-wildling-victory-game-state/MammothRidersWildlingVictoryGameState";
import MammothRidersWildlingVictoryComponent from "./MammothRidersWildlingVictoryComponent";
import MammothRidersNightsWatchVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/mammoth-riders-nights-watch-victory-game-state/MammothRidersNightsWatchVictoryGameState";
import MammothRidersNightsWatchVictoryComponent from "./MammothRidersNightsWatchVictoryComponent";
import TheHordeDescendsWildlingVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/the-horde-descends-wildling-victory-game-state/TheHordeDescendsWildlingVictoryGameState";
import TheHordeDescendsWildlingVictoryComponent from "./TheHordeDescendsWildlingVictoryComponent";
import TheHordeDescendsNightsWatchVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/the-horde-descends-nights-watch-victory-game-state/TheHordeDescendsNightsWatchVictoryGameState";
import TheHordeDescendsNightsWatchVictoryComponent from "./TheHordeDescendsNightsWatchVictoryComponent";
import ListGroupItem from "react-bootstrap/ListGroupItem";
import WildlingCardComponent from "../utils/WildlingCardComponent";
import joinReactNodes from "../../../client/utils/joinReactNodes";

@observer
export default class WildlingsAttackComponent extends Component<GameStateComponentProps<WildlingsAttackGameState>> {
    render(): ReactNode {
        const wildlingCardType = this.props.gameState.wildlingCard ? this.props.gameState.wildlingCard.type : null;
        return (
            <>
                {wildlingCardType && (
                    <ListGroupItem>
                        <Row className="justify-content-center">
                            <Col xs="auto">
                                <WildlingCardComponent cardType={wildlingCardType}/>
                            </Col>
                        </Row>
                    </ListGroupItem>
                )}
                <ListGroupItem>
                    <Row>
                        {this.props.gameState.childGameState instanceof BiddingGameState && (
                            <Col xs={12}>
                                <b>All houses</b>{this.props.gameState.excludedHouses.length >0 && 
                                (<> except {joinReactNodes(this.props.gameState.excludedHouses.map(h => 
                                <b key={h.id}>{h.name}</b>), ", ")}</>)} bid Power tokens to overcome the 
                                Wildlings which are attacking with a strength of <b>{this.props.gameState.game.wildlingStrength}</b>!
                            </Col>
                        )}
                        {renderChildGameState<WildlingsAttackGameState>(this.props, [
                            [SimpleChoiceGameState, SimpleChoiceComponent],
                            [BiddingGameState, BiddingComponent],
                            [PreemptiveRaidWildlingVictoryGameState, PreemptiveRaidWildlingVictoryComponent],
                            [CrowKillersWildlingVictoryGameState, CrowKillersWildlingVictoryComponent],
                            [CrowKillersNightsWatchVictoryGameState, CrowKillersNigthsWatchVictoryComponent],
                            [RattleshirtsRaidersWildlingVictoryGameState, RattleshirtsRaidersWildlingVictoryComponent],
                            [MassingOnTheMilkwaterWildlingVictoryGameState, MassingOnTheMilkwaterWildlingVictoryComponent],
                            [AKingBeyondTheWallWildlingVictoryGameState, AKingBeyondTheWallWildlingVictoryComponent],
                            [AKingBeyondTheWallNightsWatchVictoryGameState, AKingBeyondTheWallNightsWatchVictoryComponent],
                            [MammothRidersWildlingVictoryGameState, MammothRidersWildlingVictoryComponent],
                            [MammothRidersNightsWatchVictoryGameState, MammothRidersNightsWatchVictoryComponent],
                            [TheHordeDescendsWildlingVictoryGameState, TheHordeDescendsWildlingVictoryComponent],
                            [TheHordeDescendsNightsWatchVictoryGameState, TheHordeDescendsNightsWatchVictoryComponent],
                        ])}
                    </Row>
                </ListGroupItem>
            </>
        );
    }
}
