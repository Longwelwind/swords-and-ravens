import { Component, ReactNode } from "react";
import PlanningGameState from "../../common/ingame-game-state/planning-game-state/PlanningGameState";
import { observer } from "mobx-react";
import React from "react";
import GameStateComponentProps from "./GameStateComponentProps";
import ClaimVassalsGameState from "../../common/ingame-game-state/planning-game-state/claim-vassals-game-state/ClaimVassalsGameState";
import PlaceOrdersGameState from "../../common/ingame-game-state/planning-game-state/place-orders-game-state/PlaceOrdersGameState";
import renderChildGameState from "../utils/renderChildGameState";
import ClaimVassalsComponent from "./ClaimVassalsComponent";
import PlaceOrdersComponent from "./PlaceOrdersComponent";
import MusteringGameState from "../../common/ingame-game-state/westeros-game-state/mustering-game-state/MusteringGameState";
import MusteringComponent from "./MusteringComponent";
import { Row, Col } from "react-bootstrap";
import WesterosCardComponent from "./utils/WesterosCardComponent";
import PlaceOrdersForVassalsGameState from "../../common/ingame-game-state/planning-game-state/place-orders-for-vassals-game-state/PlaceOrdersForVassalsGameState";
import PlaceOrdersForVassalsComponent from "./PlaceOrdersForVassalsComponent";

@observer
export default class PlanningComponent extends Component<GameStateComponentProps<PlanningGameState>> {
    render(): ReactNode {
        return (
            <>
                {this.props.gameState.revealeadWesterosCards.length > 0 && (
                    <Row className="justify-content-around mb-2">
                        {this.props.gameState.revealeadWesterosCards.map((wc, i) => (
                            <Col xs="auto" key={`planning_revealed-wcs_${wc.id}_${i}`}>
                                <WesterosCardComponent
                                    cardType={wc.type}
                                    westerosDeckI={i}
                                    wasReshuffled={this.props.gameState.game.winterIsComingHappened[i]}
                                    size={"small"}
                                    tooltip={true}
                                />
                            </Col>
                        ))}
                    </Row>)}
                <Row className="justify-content-center">
                    {renderChildGameState(this.props, [
                        [PlaceOrdersGameState, PlaceOrdersComponent],
                        [PlaceOrdersForVassalsGameState, PlaceOrdersForVassalsComponent],
                        [ClaimVassalsGameState, ClaimVassalsComponent],
                        [MusteringGameState, MusteringComponent]
                    ])}
                </Row>
            </>
        );
    }
}
