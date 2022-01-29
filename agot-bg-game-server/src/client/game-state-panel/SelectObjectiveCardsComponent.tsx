import {Component, ReactNode} from "react";
import GameStateComponentProps from "./GameStateComponentProps";
import * as React from "react";
import {Row} from "react-bootstrap";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import {observable} from "mobx";
import {observer} from "mobx-react";
import SelectObjectiveCardsGameState from "../../common/ingame-game-state/select-objective-cards-game-state/SelectObjectiveCardsGameState";
import ObjectiveCardComponent from "./utils/ObjectiveCardComponent";
import { ObjectiveCard } from "../../common/ingame-game-state/game-data-structure/static-data-structure/ObjectiveCard";
import House from "../../common/ingame-game-state/game-data-structure/House";
import _ from "lodash";

@observer
export default class SelectObjectiveCardsComponent extends Component<GameStateComponentProps<SelectObjectiveCardsGameState<any>>> {
    @observable selectedObjectiveCards: ObjectiveCard[] = [];

    get house(): House | null {
        return this.props.gameClient.authenticatedPlayer?.house ?? null;
    }

    get gameState(): SelectObjectiveCardsGameState<any> {
        return this.props.gameState;
    }

    get mustChooseCards(): boolean {
        return this.house != null && this.gameState.participatingHouses.includes(this.house) && !this.gameState.readyHouses.has(this.house);
    }

    get choosableObjectives(): ObjectiveCard[] {
        return this.house != null ? this.gameState.selectableCardsPerHouse.get(this.house) : [];
    }

    render(): ReactNode {
        return (
            <>
                {this.mustChooseCards && <Col xs={12}>
                    <Row className="justify-content-center">
                        <Col xs="12">
                            <Row className="justify-content-center">
                                {this.choosableObjectives.map(oc => (
                                    <Col xs="auto" key={oc.id}>
                                        <ObjectiveCardComponent
                                            objectiveCard={oc}
                                            size="smedium"
                                            selected={this.selectedObjectiveCards.includes(oc)}
                                            onClick={() => this.selectedObjectiveCards.includes(oc) ? _.pull(this.selectedObjectiveCards, oc) : this.selectedObjectiveCards.push(oc)}
                                        />
                                    </Col>
                                ))}
                            </Row>
                        </Col>
                        <Col xs="auto">
                            <Button variant="success" onClick={() => this.confirm()} disabled={!this.gameState.canBeSkipped && this.selectedObjectiveCards.length != this.gameState.count}>
                                Confirm
                            </Button>
                        </Col>
                    </Row>
                </Col>}
                <Col xs={12} className="text-center">
                    Waiting for {this.gameState.notReadyHouses.map(h => h.name).join(", ")}
                </Col>
            </>
        );
    }

    confirm(): void {
        if (!this.gameState.canBeSkipped && this.selectedObjectiveCards.length != this.gameState.count) {
            return;
        }

        if (this.gameState.canBeSkipped && this.choosableObjectives.length > 0 && this.selectedObjectiveCards.length == 0) {
            if (!window.confirm("Are you sure you don't want to score an Objective card?")) {
                return;
            }
        }

        this.props.gameState.select(this.selectedObjectiveCards);
        this.selectedObjectiveCards = [];
    }
}
