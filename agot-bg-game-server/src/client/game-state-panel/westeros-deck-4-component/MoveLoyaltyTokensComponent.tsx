import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import MoveLoyaltyTokensGameState from "../../../common/ingame-game-state/westeros-game-state/westeros-deck-4-game-state/move-loyalty-tokens-game-state/MoveLoyaltyTokensGameState";
import ResolveMoveLoyaltyTokenGameState from "../../../common/ingame-game-state/westeros-game-state/westeros-deck-4-game-state/move-loyalty-tokens-game-state/resolve-move-loyalty-token-game-state/ResolveMoveLoyaltyTokenGameState";
import ResolveMoveLoyaltyTokenComponent from "./ResolveMoveLoyaltyTokenComponent";
import { Col, FormCheck, OverlayTrigger, Tooltip } from "react-bootstrap";

@observer
export default class MoveLoyaltyTokensComponent extends Component<GameStateComponentProps<MoveLoyaltyTokensGameState>> {
    get gameState(): MoveLoyaltyTokensGameState {
        return this.props.gameState;
    }

    render(): ReactNode {
        return (
            <>
                {renderChildGameState(this.props, [
                    [SimpleChoiceGameState, SimpleChoiceComponent],
                    [ResolveMoveLoyaltyTokenGameState, ResolveMoveLoyaltyTokenComponent]
                ])}
                {this.props.gameClient.doesControlHouse(this.props.gameState.game.targaryen) && <Col xs={12} className="d-flex justify-content-center mt-3">
                    <FormCheck
                        id="accept-all-movements-switch"
                        className="text-normal"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="accept-all-movements-switch-tooltip">
                                    If this option is enabled, all loyalty token movements will be accepted automatically.
                                </Tooltip>}
                                placement="auto"
                                delay={{ show: 250, hide: 100 }}
                            >
                                <label htmlFor="accept-all-movements-switch">Accept all movements</label>
                            </OverlayTrigger>}
                        checked={this.props.gameState.acceptAllMovements}
                        onChange={() => this.onAcceptAllMovementsChange()}
                    />
                </Col>}
            </>
        );
    }

    onAcceptAllMovementsChange() {
        this.props.gameState.acceptAllMovements = !this.props.gameState.acceptAllMovements;
        this.props.gameState.sendAcceptAllMovements(this.props.gameState.acceptAllMovements);
    }
}
