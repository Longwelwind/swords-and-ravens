import { t } from "./i18n";
import { Component, ReactNode } from "react";
import React from "react";
import { Col } from "react-bootstrap";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import HouseNumberResultsComponent from "./HouseNumberResultsComponent";
import { observer } from "mobx-react";

interface PossiblePowerTokenGainsComponentProps {
  ingame: IngameGameState;
}

@observer
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

    return (
      <>
        <Col xs="12" className="text-center">
          {t(
            "possiblePowerTokenGains.possibleGainsForChoosingGameOfThrones3e6bd4"
          )}
        </Col>
        <Col xs="auto">
          <HouseNumberResultsComponent results={gains.entries} />
        </Col>
      </>
    );
  }
}
