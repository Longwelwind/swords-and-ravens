import { Trans } from "../i18n";
import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import React from "react";
import Col from "react-bootstrap/Col";
import SimpleChoiceGameState from "../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import GameStateComponentProps from "./GameStateComponentProps";
import SimpleChoiceComponent from "./SimpleChoiceComponent";
import renderChildGameState from "../utils/renderChildGameState";
import TakeControlOfEnemyPortGameState from "../../common/ingame-game-state/take-control-of-enemy-port-game-state/TakeControlOfEnemyPortGameState";

@observer
export default class TakeControlOfEnemyPortComponent extends Component<
  GameStateComponentProps<TakeControlOfEnemyPortGameState>
> {
  render(): ReactNode {
    return (
      <>
        <Col xs={12} className="text-center">
          <p>
            <Trans
              i18nKey="takeControlOfEnemyPort.houseHasToChooseTheAmountOfShipsTo96a595"
              values={{
                newController: this.props.gameState.newController.name,
                port: this.props.gameState.port.name
              }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </p>
        </Col>
        {renderChildGameState(this.props, [
          [SimpleChoiceGameState, SimpleChoiceComponent]
        ])}
      </>
    );
  }
}
