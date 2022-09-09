import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import * as React from "react";
import renderChildGameState from "../utils/renderChildGameState";
import GameStateComponentProps from "./GameStateComponentProps";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import ShiftingAmbitionsGameState, { ShiftingAmbitionsStep } from "../../common/ingame-game-state/westeros-game-state/shifting-ambitions-game-state/ShiftingAmbitionsGameState";
import SelectObjectiveCardsGameState from "../../common/ingame-game-state/select-objective-cards-game-state/SelectObjectiveCardsGameState";
import SelectObjectiveCardsComponent from "./SelectObjectiveCardsComponent";
import ObjectiveCardComponent from "./utils/ObjectiveCardComponent";

@observer
export default class ShiftingAmbitionsComponent extends Component<GameStateComponentProps<ShiftingAmbitionsGameState>> {
    get gameState(): ShiftingAmbitionsGameState {
        return this.props.gameState;
    }
    render(): ReactNode {
        const drawPool = this.gameState.objectiveCardPool.length > 0 && this.gameState.childGameState.participatingHouses.length == 1 && !this.props.gameClient.doesControlHouse(this.gameState.childGameState.participatingHouses[0]);
        return <Col xs={12}>
            <Row className="justify-content-center">
                <Col xs={12} className="text-center">
                    {this.gameState.step == ShiftingAmbitionsStep.CHOOSE_OBJECTIVE_FROM_HAND
                        ? <>Each house choose 1 Objective card from their hand and places it facedown in a common area.<br/>
                        <small>(Then the facedown cards are shuffled and flipped faceup and each house chooses 1 of these cards and places it into their hand.)</small></>
                        : <>In turn order, each house chooses 1 Objective card from the common area and places it into their hand.</>
                    }
                </Col>
                {drawPool && <Col xs="12">
                    <Row className="justify-content-center">
                        {this.gameState.objectiveCardPool.map(oc => (
                            <Col xs="auto" key={`shifting-ambitions_${oc.id}`}>
                                <ObjectiveCardComponent
                                    objectiveCard={oc}
                                    size="smedium"
                                />
                            </Col>
                        ))}
                    </Row>
                </Col>}
                {renderChildGameState(this.props, [
                    [SelectObjectiveCardsGameState, SelectObjectiveCardsComponent]
                ])}
            </Row>
        </Col>;
    }
}
