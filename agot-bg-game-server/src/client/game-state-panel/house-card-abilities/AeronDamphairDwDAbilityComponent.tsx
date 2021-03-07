import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React, {Fragment} from "react";
import Row from "react-bootstrap/Row";
import ListGroupItem from "react-bootstrap/ListGroupItem";
import Col from "react-bootstrap/Col";
import AeronDamphairAdwdAbilityGameState from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/aeron-damphair-dwd-ability-game-state/AeronDamphairDwDAbilityGameState"
import BiddingGameState from "../../../common/ingame-game-state/westeros-game-state/bidding-game-state/BiddingGameState";
import BiddingComponent from "../BiddingComponent";

@observer
export default class AeronDamphairAdwdAbilityComponent extends Component<GameStateComponentProps<AeronDamphairAdwdAbilityGameState>> {
    render(): ReactNode {
        return <>
            <ListGroupItem>
                <Row>
                    <Col xs={12}>
                        <b>Aeron Damphair:</b> Greyjoy can spend power tokens to increase it's combat strength by the number of tokens spent.
                    </Col>
                    <Fragment key="Increase combat strength">
                        {renderChildGameState(this.props, [
                            [BiddingGameState, BiddingComponent]
                        ])}
                    </Fragment>
                </Row>
            </ListGroupItem>
        </>;
    }
}