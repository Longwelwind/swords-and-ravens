import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import React from "react";
import GameStateComponentProps from "./GameStateComponentProps";
import GameEndedGameState from "../../common/ingame-game-state/game-ended-game-state/GameEndedGameState";
import ListGroupItem from "react-bootstrap/ListGroupItem";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import crownImage from "../../../public/images/icons/crown.svg";

@observer
export default class GameEndedComponent extends Component<GameStateComponentProps<GameEndedGameState>> {
    render(): ReactNode {
        return (
            <ListGroupItem>
                <Row>
                    <Col xs={12}>
                        <Row className="justify-content-center text-center">
                            <Col xs="auto" >
                                <p><strong>Game has ended!</strong></p>
                                <p>The winner is...</p>
                                <Row className="justify-content-center align-items-center">
                                    <Col xs="auto">
                                        <img width={48} src={crownImage}/>
                                    </Col>
                                    <Col xs="auto" style={{fontSize: "2rem"}}>
                                        {this.props.gameState.winner.name}
                                    </Col>
                                </Row>
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </ListGroupItem>
        );
    }
}
