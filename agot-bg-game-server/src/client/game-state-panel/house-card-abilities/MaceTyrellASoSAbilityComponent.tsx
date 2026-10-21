import { Trans } from "../../i18n";
import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import Col from "react-bootstrap/Col";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import MaceTyrellASoSAbilityGameState from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/mace-tyrell-asos-ability-game-state/MaceTyrellASoSAbilityGameState";

@observer
export default class MaceTyrellASoSAbilityComponent extends Component<
  GameStateComponentProps<MaceTyrellASoSAbilityGameState>
> {
  render(): ReactNode {
    return (
      <>
        <Col xs={12} className="text-center">
          <Trans
            i18nKey="maceTyrellASoSAbility.maceTyrellHouseMayChooseToPlaceASupportb85605"
            components={{
              element0: <b />,
              element1: <b />,
              value2: <>{this.props.gameState.childGameState.house.name}</>,
              element3: <b />,
              element4: <b />,
              element5: <b />,
              value6: (
                <>{this.props.gameState.combatGameState.defendingRegion.name}</>
              )
            }}
          />
        </Col>
        {renderChildGameState(this.props, [
          [SimpleChoiceGameState, SimpleChoiceComponent]
        ])}
      </>
    );
  }
}
