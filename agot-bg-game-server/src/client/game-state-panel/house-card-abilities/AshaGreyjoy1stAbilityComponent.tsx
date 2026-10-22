import { Trans } from "../../i18n";
import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import Col from "react-bootstrap/Col";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import SelectOrdersComponent from "../SelectOrdersComponent";
import SelectOrdersGameState from "../../../common/ingame-game-state/select-orders-game-state/SelectOrdersGameState";
import AshaGreyjoy1stAbilityGameState from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/asha-greyjoy-1st-ability-game-state/AshaGreyjoy1stAbilityGameState";

@observer
export default class AshaGreyjoy1stAbilityComponent extends Component<
  GameStateComponentProps<AshaGreyjoy1stAbilityGameState>
> {
  render(): ReactNode {
    return (
      <>
        <Col xs={12} className="text-center">
          <Trans
            i18nKey="ashaGreyjoy1stAbility.ashaGreyjoyHouseCanChooseToRemoveOneSupport68ca0b"
            values={{
              childGameStateHouse:
                this.props.gameState.childGameState.house.name,
              enemyHouse: this.props.gameState.combat.getEnemy(
                this.props.gameState.childGameState.house
              ).name,
              combatDefendingRegion:
                this.props.gameState.combat.defendingRegion.name
            }}
            components={{
              bold: <b />,
              bold2: <b />,
              bold3: <b />,
              bold4: <b />
            }}
          />
        </Col>
        {renderChildGameState(this.props, [
          [SimpleChoiceGameState, SimpleChoiceComponent],
          [SelectOrdersGameState, SelectOrdersComponent]
        ])}
      </>
    );
  }
}
