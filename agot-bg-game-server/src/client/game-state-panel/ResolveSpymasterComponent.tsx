import {Component, ReactNode} from "react";
import GameStateComponentProps from "./GameStateComponentProps";
import * as React from "react";
import {Row} from "react-bootstrap";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import {observable} from "mobx";
import {observer} from "mobx-react";
import WesterosCard from "../../common/ingame-game-state/game-data-structure/westeros-card/WesterosCard";
import WesterosCardComponent from "./utils/WesterosCardComponent";
import ResolveSpymasterGameState from "../../common/ingame-game-state/action-game-state/resolve-consolidate-power-game-state/execute-loan-game-state/spymaster-game-state/resolve-spymaster-game-state/ResolveSpymasterGameState";
import _ from "lodash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowsAltH } from "@fortawesome/free-solid-svg-icons";

@observer
export default class ResolveSpymasterComponent extends Component<GameStateComponentProps<ResolveSpymasterGameState<any>>> {
    @observable selectedWesterosCards: WesterosCard[] = [];
    @observable drawnWesterosCards: WesterosCard[] = this.props.gameState.westerosCards;
    render(): ReactNode {
        return (
            <>
                <Col xs={12}>
                    {this.props.gameClient.doesControlHouse(this.props.gameState.house) ? (
                        <Row className="justify-content-center mt-3">
                            <Col xs="12">
                                <Row className="justify-content-center">
                                    <Col xs={12} className="text-center">
                                        Select the card(s) to put on bottom of the deck:<br/>
                                        <small>(Don&apos;t select any to put them on top)</small>
                                    </Col>
                                </Row>
                                <Row className="justify-content-center mt-1">
                                    {this.drawnWesterosCards.map(wc => (
                                        <Col xs="auto" key={`spymaster-westeros-cards_${wc.id}`}>
                                            <WesterosCardComponent
                                                tooltip={true}
                                                cardType={wc.type}
                                                westerosDeckI={this.props.gameState.deckId}
                                                size="small"
                                                selected={this.selectedWesterosCards.includes(wc)}
                                                onClick={() => {
                                                    if (this.selectedWesterosCards.includes(wc)) {
                                                        this.selectedWesterosCards = _.without(this.selectedWesterosCards, wc);
                                                    } else {
                                                        this.selectedWesterosCards.push(wc);
                                                    }
                                                }}
                                            />
                                        </Col>
                                    ))}
                                </Row>
                                <Row className="justify-content-center">
                                    <Col xs="auto">
                                        <Button type="button" onClick={() => this.drawnWesterosCards = _.reverse(this.drawnWesterosCards)}>
                                            <FontAwesomeIcon icon={faArrowsAltH}/>
                                        </Button>
                                    </Col>
                                </Row>
                                <Row className="justify-content-center mt-4">
                                    <Col xs="auto">
                                        <Button type="button" variant="success" onClick={() => this.confirm()}>
                                            Put selected cards to bottom of the deck
                                        </Button>
                                    </Col>
                                </Row>
                            </Col>
                        </Row>
                    ) : (
                        <div className="text-center">
                            Waiting for {this.props.gameState.house.name}...
                        </div>
                    )}
                </Col>
            </>
        );
    }

    confirm(): void {
        const forTop = _.without(this.drawnWesterosCards, ...this.selectedWesterosCards);
        const forBottom = this.drawnWesterosCards.filter(wc => this.selectedWesterosCards.includes(wc));
        this.props.gameState.sendResolve(forTop, forBottom);
    }
}
