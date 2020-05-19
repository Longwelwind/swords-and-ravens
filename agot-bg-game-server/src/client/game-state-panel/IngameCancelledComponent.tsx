import {Component, ReactNode} from "react";
import ActionGameState from "../../common/ingame-game-state/action-game-state/ActionGameState";
import * as React from "react";
import {observer} from "mobx-react";
import ListGroupItem from "react-bootstrap/ListGroupItem";
import GameStateComponentProps from "./GameStateComponentProps";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons/faTimes";

@observer
export default class IngameCancelledComponent extends Component<GameStateComponentProps<ActionGameState>> {
    render(): ReactNode {
        return (
            <>
                <ListGroupItem>
                    <Row>
                        <Col className="text-center">
                            <FontAwesomeIcon icon={faTimes} size="3x"/><br/>
                            This game has been cancelled by vote
                        </Col>
                    </Row>
                </ListGroupItem>
            </>
        );
    }
}
