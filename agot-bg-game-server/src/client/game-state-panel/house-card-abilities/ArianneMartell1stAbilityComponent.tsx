import { Trans } from "../../i18n";
import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import Col from "react-bootstrap/Col";
import ArianneMartell1stAbilityGameState from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/arianne-martell-1st-ability-game-state/ArianneMartell1stAbilityGameState";
import SelectUnitsGameState from "../../../common/ingame-game-state/select-units-game-state/SelectUnitsGameState";
import SelectUnitsComponent from "../SelectUnitsComponent";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";

@observer
export default class ArianneMartell1stAbilityComponent extends Component<
  GameStateComponentProps<ArianneMartell1stAbilityGameState>
> {
  render(): ReactNode {
    return (
      <>
        {this.props.gameState.childGameState instanceof
        SimpleChoiceGameState ? (
          <Col xs={12} className="text-center">
            <Trans
              i18nKey="arianneMartell1stAbility.arianneMartellHouseMayKillAnArmyUnitOf6c291a"
              values={{
                house: this.props.gameState.house.name,
                enemy: this.props.gameState.enemy.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </Col>
        ) : (
          <Col xs={12} className="text-center">
            <Trans
              i18nKey="arianneMartell1stAbility.arianneMartellHouseMustChooseAUnitToDestroyae97fd"
              values={{ enemy: this.props.gameState.enemy.name }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </Col>
        )}
        {renderChildGameState(this.props, [
          [SimpleChoiceGameState, SimpleChoiceComponent],
          [SelectUnitsGameState, SelectUnitsComponent]
        ])}
      </>
    );
  }
}
