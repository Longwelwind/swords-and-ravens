import { Trans } from "../../i18n";
import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import SelectUnitsGameState from "../../../common/ingame-game-state/select-units-game-state/SelectUnitsGameState";
import SelectUnitsComponent from "../SelectUnitsComponent";
import EllariaSand1stAbilityGameState from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/ellaria-sand-1st-ability-game-state/EllariaSand1stAbilityGameState";
import React from "react";
import Col from "react-bootstrap/Col";

@observer
export default class EllariaSand1stAbilityComponent extends Component<
  GameStateComponentProps<EllariaSand1stAbilityGameState>
> {
  render(): ReactNode {
    return (
      <>
        <Col xs={12} className="text-center">
          <Trans
            i18nKey="ellariaSand1stAbility.ellariaSandHouseCanChooseOneDefendingFootmenTo963347"
            values={{
              childGameStateHouse:
                this.props.gameState.childGameState.house.name
            }}
            components={{
              bold: <b />,
              bold2: <b />
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
