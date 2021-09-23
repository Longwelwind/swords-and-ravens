import { observer } from "mobx-react";
import { Component, default as React, ReactNode } from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import ExecuteLoanGameState from "../../../common/ingame-game-state/action-game-state/resolve-consolidate-power-game-state/execute-loan-game-state/ExecuteLoanGameState";
import { Col, Row } from "react-bootstrap";
import LoanCardComponent from "../utils/LoanCardComponent";
import PlaceSellswordsGameState from "../../../common/ingame-game-state/action-game-state/resolve-consolidate-power-game-state/execute-loan-game-state/place-sellwords-game-state/PlaceSellswordsGameState";
import renderChildGameState from "../../../client/utils/renderChildGameState";
import PlaceSellswordsComponent from "./PlaceSellswordsComponent";

@observer
export default class ExecuteLoanComponent extends Component<GameStateComponentProps<ExecuteLoanGameState>> {
    render(): ReactNode {
        return <Col xs={12}>
            <Row className="justify-content-center">
                <Col xs="auto">
                    <LoanCardComponent loanCard={this.props.gameState.childGameState.loanCardType} />
                </Col>
            </Row>
            {this.props.gameClient.doesControlHouse(this.props.gameState.childGameState.house) &&
            <Row className="justify-content-center">
                <Col xs="auto" className="text-center">
                    {this.props.gameState.childGameState.loanCardType.description}
                </Col>
            </Row>}
            <Row>
                {renderChildGameState<ExecuteLoanGameState>(this.props, [
                    [PlaceSellswordsGameState, PlaceSellswordsComponent]
                ])}
            </Row>
        </Col>;
    }
}
