import { Component, ReactNode } from "react";
import React from "react";
import { Col } from "react-bootstrap";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import HouseNumberResultsComponent from "./HouseNumberResultsComponent";

interface PossiblePowerTokenGainsComponentProps {
    ingame: IngameGameState;
}

export default class PossiblePowerTokenGainsComponent extends Component<PossiblePowerTokenGainsComponentProps> {
    get ingame(): IngameGameState {
        return this.props.ingame;
    }

    render(): ReactNode {
        const gains = this.ingame.calculatePossibleGainsForGameOfThrones();
        gains.entries.forEach(([h, gain]) => {
            const realGain = this.ingame.assumeChangePowerTokens(h, gain);
            gains.set(h, realGain);
        });

        return <>
            <Col xs="12" className="text-center">
                Possible gains for choosing Game of Thrones
            </Col>
            <Col xs="auto">
                <HouseNumberResultsComponent results={gains.entries} />
            </Col>
        </>;
    }
}