import {Component} from "react";
import * as React from "react";
import {observer} from "mobx-react";
import SimpleChoiceGameState from "../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import GameStateComponentProps from "./GameStateComponentProps";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

@observer
export default class SimpleChoiceComponent extends Component<GameStateComponentProps<SimpleChoiceGameState>> {
    render(): JSX.Element {
        return (
            <>
                <Col xs={12} className="text-center" style={{whiteSpace: "pre-line"}}>
                    {this.props.gameState.description}
                </Col>
                <Col xs={12} className="text-center">
                    {this.props.gameClient.doesControlHouse(this.props.gameState.house) ? (
                        <Row className="justify-content-center">
                            {this.props.gameState.choices.map((s, i) => (
                                <Col xs="auto" key={`simple-choice_${i}`}>
                                    <Button type="button" onClick={() => this.choose(i)}>{s}</Button>
                                </Col>
                            ))}
                        </Row>
                    ) : (
                        <>Waiting for {this.props.gameState.parentGameState.ingame.getControllerOfHouse(this.props.gameState.house).house.name}...</>
                    )}
                </Col>
            </>
        );
    }

    choose(choice: number): void {
        this.props.gameState.choose(choice);
    }
}
