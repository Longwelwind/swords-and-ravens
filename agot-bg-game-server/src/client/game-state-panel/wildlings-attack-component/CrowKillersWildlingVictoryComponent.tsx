import { t, Trans } from "../../i18n";
import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import SelectUnitsGameState from "../../../common/ingame-game-state/select-units-game-state/SelectUnitsGameState";
import SelectUnitsComponent from "../SelectUnitsComponent";
import CrowKillersWildlingVictoryGameState, {
  CrowKillersStep
} from "../../../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/crow-killers-wildling-victory-game-state/CrowKillersWildlingVictoryGameState";
import Col from "react-bootstrap/Col";
import React from "react";
import TakeControlOfEnemyPortGameState from "../../../common/ingame-game-state/take-control-of-enemy-port-game-state/TakeControlOfEnemyPortGameState";
import TakeControlOfEnemyPortComponent from "../TakeControlOfEnemyPortComponent";
import { Row } from "react-bootstrap";

@observer
export default class CrowKillersWildlingVictoryComponent extends Component<
  GameStateComponentProps<CrowKillersWildlingVictoryGameState>
> {
  render(): ReactNode {
    return (
      <Row
        className="justify-content-center text-center"
        key={`crow-killers-wildling-victory-${this.props.gameState.entireGame.leafStateId}`}
      >
        {this.props.gameState.childGameState instanceof SelectUnitsGameState &&
          (this.props.gameState.step == CrowKillersStep.DEGRADING_KNIGHTS ? (
            <Col xs={12}>
              <Trans
                i18nKey="crowKillersWildlingVictory.replacesOfTheirKnightsWithAvailableFootmen4d49fb"
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
          ) : this.props.gameState.step ==
            CrowKillersStep.DESTROYING_KNIGHTS ? (
            <Col xs={12}>
              <Trans
                i18nKey="crowKillersWildlingVictory.hasToDestroyOfTheirKnightsBeforeTheRest0b5212"
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
          ) : (
            <Col xs={12}>
              {t("crowKillersWildlingVictory.invalidCrowkillersstepe082ca")}
            </Col>
          ))}
        {renderChildGameState(this.props, [
          [SelectUnitsGameState, SelectUnitsComponent],
          [TakeControlOfEnemyPortGameState, TakeControlOfEnemyPortComponent]
        ])}
      </Row>
    );
  }
}
