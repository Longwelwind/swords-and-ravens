import { Trans } from "../i18n";
import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import ChooseCasualtiesGameState from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/choose-casualties-game-state/ChooseCasualtiesGameState";
import React from "react";
import GameStateComponentProps from "./GameStateComponentProps";
import Col from "react-bootstrap/Col";
import renderChildGameState from "../utils/renderChildGameState";
import SelectUnitsGameState from "../../common/ingame-game-state/select-units-game-state/SelectUnitsGameState";
import SelectUnitsComponent from "./SelectUnitsComponent";

@observer
export default class ChooseCasualtiesComponent extends Component<
  GameStateComponentProps<ChooseCasualtiesGameState>
> {
  render(): ReactNode {
    return (
      <>
        <Col xs={12} className="text-center">
          <Trans
            i18nKey="chooseCasualties.houseMustChooseOfTheirUnitsAsCasualtiesOf8d30b4"
            components={{
              element0: <b />,
              value1: <>{this.props.gameState.childGameState.house.name}</>,
              element2: <b />,
              value3: <>{this.props.gameState.childGameState.count}</>
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
