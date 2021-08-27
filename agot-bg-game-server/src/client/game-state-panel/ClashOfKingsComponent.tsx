import {observer} from "mobx-react";
import ClashOfKingsGameState
    from "../../common/ingame-game-state/westeros-game-state/clash-of-kings-game-state/ClashOfKingsGameState";
import {Component, ReactNode, Fragment} from "react";
import BiddingGameState from "../../common/ingame-game-state/westeros-game-state/bidding-game-state/BiddingGameState";
import BiddingComponent from "./BiddingComponent";
import ResolveTiesGameState
    from "../../common/ingame-game-state/westeros-game-state/clash-of-kings-game-state/resolve-ties-game-state/ResolveTiesGameState";
import * as React from "react";
import ResolveTiesComponent from "./ResolveTiesComponent";
import renderChildGameState from "../utils/renderChildGameState";
import GameStateComponentProps from "./GameStateComponentProps";
import Row from "react-bootstrap/Row";
import ListGroupItem from "react-bootstrap/ListGroupItem";
import Col from "react-bootstrap/Col";

@observer
export default class ClashOfKingsComponent extends Component<GameStateComponentProps<ClashOfKingsGameState>> {
    render(): ReactNode {
        return <>
            <ListGroupItem>
                <Row className="justify-content-center">
                    <Col xs={12} className="text-center">
                        Houses bid for the <strong>
                        {this.props.gameState.game.getNameInfluenceTrack(this.props.gameState.currentTrackI)}</strong> track.
                    </Col>
                    <Fragment key={this.props.gameState.currentTrackI}>
                        {renderChildGameState(this.props, [
                            [BiddingGameState, BiddingComponent],
                            [ResolveTiesGameState, ResolveTiesComponent]
                        ])}
                    </Fragment>
                </Row>
            </ListGroupItem>
        </>;
    }
}
