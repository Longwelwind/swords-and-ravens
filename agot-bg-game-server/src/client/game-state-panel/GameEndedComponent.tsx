import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import React from "react";
import GameStateComponentProps from "./GameStateComponentProps";
import GameEndedGameState from "../../common/ingame-game-state/game-ended-game-state/GameEndedGameState";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import crownImage from "../../../public/images/icons/crown.svg";
import introSound from "../../../public/sounds/game-of-thrones-intro.ogg";
import HouseIconComponent from "./utils/HouseIconComponent";
import { houseColorFilters } from "../houseColorFilters";

@observer
export default class GameEndedComponent extends Component<GameStateComponentProps<GameEndedGameState>> {
    render(): ReactNode {
        const winner = this.props.gameState.winner;
        /*  The crown image has a width of 128, the house icon 160 which is a difference of 32.
            To center the crown we need to apply a margin of 16px on the left, and a custom value for non-centered house icons
        */
        let crownMarginLeft = "16px";
        switch(winner.name) {
            case "Lannister":
                crownMarginLeft = "-12px";
                break;
            case "Tyrell":
                crownMarginLeft = "36px";
                break;
            case "Stark":
                crownMarginLeft = "0px";
            case "Bolton":
                crownMarginLeft = "8px";
                break;
        }

        let crownMarginBottom = "-72px";
        switch(winner.name) {
            case "Arryn":
            case "Targaryen":
            case "Bolton":
                crownMarginBottom = "-45px";
                break;
            case "Martell":
                crownMarginBottom = "-55px";
                break;
        }

        return (
            <>
                <Col xs="12">
                    <Row className="justify-content-center">
                            <Col xs="12" className="d-flex justify-content-center">
                                <h3><b>Game has ended!</b></h3>
                            </Col>
                            <Col xs="12" className="d-flex justify-content-center" style={{ marginTop: "-40px"}} >
                                <div>
                                    <img width={128} src={crownImage} style={{ filter: houseColorFilters.get(winner.id), marginBottom: crownMarginBottom, marginLeft: crownMarginLeft}} />
                                    <HouseIconComponent house={winner} size={160} />
                                </div>
                            </Col>
                            <Col xs="12" className="d-flex justify-content-center">
                                <h5>House <b>{winner.name}</b> has won this Game of Thrones.</h5>
                            </Col>
                    </Row>
                </Col>
                {!this.props.gameClient.musicMuted && <audio id="game-ended-sound" src={introSound} autoPlay />}
            </>
        );
    }
}
