import { observer } from "mobx-react";
import { Component, default as React, ReactNode } from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import ExecuteLoanGameState from "../../../common/ingame-game-state/action-game-state/resolve-consolidate-power-game-state/execute-loan-game-state/ExecuteLoanGameState";
import { Col, Row } from "react-bootstrap";
import LoanCardComponent from "../utils/LoanCardComponent";
import PlaceSellswordsGameState from "../../../common/ingame-game-state/action-game-state/resolve-consolidate-power-game-state/execute-loan-game-state/place-sellwords-game-state/PlaceSellswordsGameState";
import renderChildGameState from "../../../client/utils/renderChildGameState";
import PlaceSellswordsComponent from "./PlaceSellswordsComponent";
import TheFacelessMenGameState from "../../../common/ingame-game-state/action-game-state/resolve-consolidate-power-game-state/execute-loan-game-state/the-faceless-men-game-state/TheFacelessMenGameState";
import TheFacelessMenComponent from "../TheFacelessMenComponent";
import PyromancerGameState from "../../../common/ingame-game-state/action-game-state/resolve-consolidate-power-game-state/execute-loan-game-state/pyromancer-game-state/PyromancerGameState";
import PyromancerComponent from "../PyromancerComponent";
import House from "../../../common/ingame-game-state/game-data-structure/House";
import ExpertArtificerGameState from "../../../common/ingame-game-state/action-game-state/resolve-consolidate-power-game-state/execute-loan-game-state/expert-artificer-game-state/ExpertArtificerGameState";
import ExpertArtificerComponent from "../ExpertArtificerComponent";
import LoyalMaesterGameState from "../../../common/ingame-game-state/action-game-state/resolve-consolidate-power-game-state/execute-loan-game-state/loyal-maester-game-state/LoyalMaesterGameState";
import LoyalMaesterComponent from "../LoyalMaesterComponent";
import MasterAtArmsGameState from "../../../common/ingame-game-state/action-game-state/resolve-consolidate-power-game-state/execute-loan-game-state/master-at-arms-game-state/MasterAtArmsGameState";
import MasterAtArmsComponent from "../MasterAtArmsComponent";

@observer
export default class ExecuteLoanComponent extends Component<GameStateComponentProps<ExecuteLoanGameState>> {
    get house(): House {
        if (this.props.gameState.childGameState instanceof PlaceSellswordsGameState ||
            this.props.gameState.childGameState instanceof TheFacelessMenGameState) {
                return this.props.gameState.childGameState.house;
        } else {
            return this.props.gameState.childGameState.childGameState.house;
        }
    }
    render(): ReactNode {
        return <Col xs={12}>
            <Row className="justify-content-center">
                <Col xs="auto">
                    <LoanCardComponent loanCard={this.props.gameState.loanCardType} />
                </Col>
            </Row>
            {this.props.gameClient.doesControlHouse(this.house) &&
            <Row className="justify-content-center">
                <Col xs="auto" className="text-center">
                    {this.props.gameState.loanCardType.description}
                </Col>
            </Row>}
            <Row>
                {renderChildGameState<ExecuteLoanGameState>(this.props, [
                    [PlaceSellswordsGameState, PlaceSellswordsComponent],
                    [TheFacelessMenGameState, TheFacelessMenComponent],
                    [PyromancerGameState, PyromancerComponent],
                    [ExpertArtificerGameState, ExpertArtificerComponent],
                    [LoyalMaesterGameState, LoyalMaesterComponent],
                    [MasterAtArmsGameState, MasterAtArmsComponent]
                ])}
            </Row>
        </Col>;
    }
}
