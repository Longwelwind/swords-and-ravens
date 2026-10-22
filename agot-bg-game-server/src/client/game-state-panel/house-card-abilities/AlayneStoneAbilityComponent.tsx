import { Trans } from "../../i18n";
import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import Col from "react-bootstrap/Col";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import AlayneStoneAbilityGameState from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/alayne-stone-ability-game-state/AlayneStoneAbilityGameState";

@observer
export default class AlayneStoneAbilityComponent extends Component<
  GameStateComponentProps<AlayneStoneAbilityGameState>
> {
  render(): ReactNode {
    return (
      <>
        <Col xs={12} className="text-center">
          <Trans
            i18nKey="alayneStoneAbility.alayneStoneHouseMayDiscard2PowerTokensTo715d34"
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
          [SimpleChoiceGameState, SimpleChoiceComponent]
        ])}
      </>
    );
  }
}
