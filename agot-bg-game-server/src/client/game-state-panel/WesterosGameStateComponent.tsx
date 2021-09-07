import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import WesterosGameState from "../../common/ingame-game-state/westeros-game-state/WesterosGameState";
import WildlingsAttackGameState
    from "../../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/WildlingsAttackGameState";
import * as React from "react";
import WildlingsAttackComponent from "./wildlings-attack-component/WildlingsAttackComponent";
import ReconcileArmiesGameState
    from "../../common/ingame-game-state/westeros-game-state/reconcile-armies-game-state/ReconcileArmiesGameState";
import ReconcileArmiesComponent from "./ReconcileArmiesComponent";
import ClashOfKingsGameState
    from "../../common/ingame-game-state/westeros-game-state/clash-of-kings-game-state/ClashOfKingsGameState";
import ClashOfKingsComponent from "./ClashOfKingsComponent";
import MusteringGameState
    from "../../common/ingame-game-state/westeros-game-state/mustering-game-state/MusteringGameState";
import MusteringComponent from "./MusteringComponent";
import ListGroupItem from "react-bootstrap/ListGroupItem";
import PutToTheSwordGameState
    from "../../common/ingame-game-state/westeros-game-state/put-to-the-swords-game-state/PutToTheSwordGameState";
import SimpleChoiceComponent from "./SimpleChoiceComponent";
import DarkWingsDarkWordsGameState
    from "../../common/ingame-game-state/westeros-game-state/dark-wings-dark-words-game-state/DarkWingsDarkWordsGameState";
import AThroneOfBladesGameState
    from "../../common/ingame-game-state/westeros-game-state/thrones-of-blades-game-state/AThroneOfBladesGameState";
import GameStateComponentProps from "./GameStateComponentProps";
import renderChildGameState from "../utils/renderChildGameState";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import classNames from "classnames";
import WesterosCardComponent from "./utils/WesterosCardComponent";
import WesterosDeck4GameState from "../../common/ingame-game-state/westeros-game-state/westeros-deck-4-game-state/WesterosDeck4GameState";
import WesterosDeck4Component from "./westeros-deck-4-component/WesterosDeck4Component";

@observer
export default class WesterosGameStateComponent extends Component<GameStateComponentProps<WesterosGameState>> {
    render(): ReactNode {
        return (
            <>
                <ListGroupItem className="px-2">
                    <Row className="justify-content-around">
                        {this.props.gameState.revealedCards.map((wc, i) => (
                            <Col xs="auto" key={i}>
                                <WesterosCardComponent
                                    cardType={wc.type}
                                    westerosDeckI={i}
                                    size={"small"}
                                    tooltip={true}
                                    classNames={classNames({"medium-outline": this.props.gameState.currentCardI == i})}
                                />
                            </Col>
                        ))}
                    </Row>
                </ListGroupItem>
                {this.props.gameState.childGameState instanceof PutToTheSwordGameState ? (
                    <ListGroupItem className="px-2">
                        <Row>
                            <SimpleChoiceComponent gameClient={this.props.gameClient}
                                                   gameState={this.props.gameState.childGameState.childGameState}
                                                   mapControls={this.props.mapControls}/>
                        </Row>
                    </ListGroupItem>
                ) : this.props.gameState.childGameState instanceof DarkWingsDarkWordsGameState ? (
                    <ListGroupItem className="px-2">
                        <Row>
                            <SimpleChoiceComponent gameClient={this.props.gameClient}
                                                   gameState={this.props.gameState.childGameState.childGameState}
                                                   mapControls={this.props.mapControls}/>
                        </Row>
                    </ListGroupItem>
                ) : this.props.gameState.childGameState instanceof AThroneOfBladesGameState ? (
                    <ListGroupItem className="px-2">
                        <Row>
                            <SimpleChoiceComponent gameClient={this.props.gameClient}
                                                   gameState={this.props.gameState.childGameState.childGameState}
                                                   mapControls={this.props.mapControls}/>
                        </Row>
                    </ListGroupItem>
                ) : renderChildGameState(this.props, [
                    [WildlingsAttackGameState, WildlingsAttackComponent],
                    [ReconcileArmiesGameState, ReconcileArmiesComponent],
                    [ClashOfKingsGameState, ClashOfKingsComponent],
                    [MusteringGameState, MusteringComponent],
                    [WesterosDeck4GameState, WesterosDeck4Component]
                ])}
            </>
        );
    }
}
