import { Component, ReactNode } from "react";
import * as React from "react";
import { observer } from "mobx-react";
import GameStateComponentProps from "./GameStateComponentProps";
import Row from "react-bootstrap/Row";
import Player from "../../common/ingame-game-state/Player";
import { Button, Col } from "react-bootstrap";
import HouseCardComponent from "./utils/HouseCardComponent";
import ThematicDraftHouseCardsGameState from "../../common/ingame-game-state/draft-game-state/thematic-draft-house-cards-game-state/ThematicDraftHouseCardsGameState";
import { observable } from "mobx";
import HouseCard from "../../common/ingame-game-state/game-data-structure/house-card/HouseCard";

@observer
export default class ThematicDraftHouseCardsComponent extends Component<GameStateComponentProps<ThematicDraftHouseCardsGameState>> {
    @observable selectedHouseCard: HouseCard | null;

    get player(): Player | null {
        return this.props.gameClient.authenticatedPlayer;
    }

    render(): ReactNode {
        return (
            <>
                <Row className="justify-content-center">
                    <Col xs={12} className="text-center">
                        All houses choose their House cards.
                    </Col>
                </Row>
                {this.player && this.props.gameState.getNotReadyPlayers().includes(this.player) &&
                    <>
                        <Row className="mt-3 justify-content-center">
                            <Col xs="12" className="text-center">
                                Please select a House card:
                            </Col>
                        </Row>
                        <Row className="justify-content-center">
                            <Col xs="12">
                                <Row className="justify-content-center">
                                    {this.props.gameState.getFilteredHouseCardsForHouse(this.player.house).map(hc => (
                                        <Col xs="auto" key={`thematic-draft-${hc.id}`}>
                                            <HouseCardComponent
                                                houseCard={hc}
                                                size="small"
                                                selected={this.selectedHouseCard == hc}
                                                onClick={() => this.selectedHouseCard = this.selectedHouseCard != hc ? hc : null}
                                            />
                                        </Col>
                                    ))}
                                </Row>
                            </Col>
                            <Col xs="auto">
                                <Button type="button" variant="success" onClick={() => this.confirm()} disabled={this.selectedHouseCard == null}>
                                    Confirm
                                </Button>
                            </Col>
                        </Row>

                    </>}
                <Row className="mt-3 justify-content-center">
                    <Col xs={12} className="text-center">
                        Waiting for {this.props.gameState.getNotReadyPlayers().map(p => p.house.name).join(", ")}...
                    </Col>
                </Row>
            </>
        );
    }

    confirm(): void {
        if (!this.selectedHouseCard) {
            return;
        }

        this.props.gameState.select(this.selectedHouseCard);
        this.selectedHouseCard = null;
    }
}
