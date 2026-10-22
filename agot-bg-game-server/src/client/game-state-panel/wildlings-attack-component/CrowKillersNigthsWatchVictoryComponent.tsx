import { Trans } from "../../i18n";
import { observer } from "mobx-react";
import React, { Component, ReactNode } from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import SelectUnitsGameState from "../../../common/ingame-game-state/select-units-game-state/SelectUnitsGameState";
import SelectUnitsComponent from "../SelectUnitsComponent";
import CrowKillersNightsWatchVictoryGameState from "../../../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/crow-killers-nights-watch-victory-game-state/CrowKillersNightsWatchVictoryGameState";
import Col from "react-bootstrap/Col";

@observer
export default class CrowKillersNigthsWatchVictoryComponent extends Component<
  GameStateComponentProps<CrowKillersNightsWatchVictoryGameState>
> {
  render(): ReactNode {
    return (
      <>
        <Col xs={12}>
          <Trans
            i18nKey="crowKillersNigthsWatchVictory.mayImmediatelyReplaceUpToOfHisFootmenWith97e56a"
            values={{
              childGameStateHouse:
                this.props.gameState.childGameState.house.name,
              childGameStateCount: this.props.gameState.childGameState.count
            }}
            components={{
              bold: <b />
            }}
          />
        </Col>
        {renderChildGameState(this.props, [
          [SelectUnitsGameState, SelectUnitsComponent]
        ])}
      </>
    );
  }
}
