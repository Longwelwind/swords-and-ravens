import { Trans } from "../../i18n";
import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import Col from "react-bootstrap/Col";
import MelisandreOfAsshai1stAbilityGameState from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/melisandre-of-asshai-1st-ability-game-state/MelisandreOfAsshai1stAbilityGameState";
import SelectHouseCardGameState from "../../../common/ingame-game-state/select-house-card-game-state/SelectHouseCardGameState";
import SelectHouseCardComponent from "../SelectHouseCardComponent";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";

@observer
export default class MelisandreOfAsshai1stAbilityComponent extends Component<
  GameStateComponentProps<MelisandreOfAsshai1stAbilityGameState>
> {
  render(): ReactNode {
    return (
      <>
        <Col xs={12} className="text-center">
          <Trans
            i18nKey="melisandreOfAsshai1stAbility.melisandreOfAsshaiHouseMayChooseToExpendOne636cfa"
            values={{
              childGameStateHouse:
                this.props.gameState.childGameState.house.name,
              enemyHouse: this.props.gameState.combat.getEnemy(
                this.props.gameState.childGameState.house
              ).name
            }}
            components={{
              bold: <b />,
              bold2: <b />,
              bold3: <b />
            }}
          />
        </Col>
        {renderChildGameState(this.props, [
          [SimpleChoiceGameState, SimpleChoiceComponent],
          [SelectHouseCardGameState, SelectHouseCardComponent]
        ])}
      </>
    );
  }
}
