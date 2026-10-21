import { Trans, t } from "../../i18n";
import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import Col from "react-bootstrap/Col";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import RobertArrynAbilityGameState from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/robert-arryn-ability-game-state/RobertArrynAbilityGameState";
import SelectHouseCardGameState from "../../../common/ingame-game-state/select-house-card-game-state/SelectHouseCardGameState";
import SelectHouseCardComponent from "../SelectHouseCardComponent";
import joinReactNodes from "../../../client/utils/joinReactNodes";
import House from "../../../common/ingame-game-state/game-data-structure/House";

@observer
export default class RobertArrynAbilityComponent extends Component<
  GameStateComponentProps<RobertArrynAbilityGameState>
> {
  get gameState(): RobertArrynAbilityGameState {
    return this.props.gameState;
  }

  get house(): House {
    return this.gameState.childGameState.house;
  }

  get simpleChoice(): SimpleChoiceGameState | null {
    return this.gameState.childGameState instanceof SimpleChoiceGameState
      ? this.gameState.childGameState
      : null;
  }

  get selectHouseCard(): SelectHouseCardGameState<RobertArrynAbilityGameState> | null {
    return this.gameState.childGameState instanceof SelectHouseCardGameState
      ? this.gameState.childGameState
      : null;
  }

  render(): ReactNode {
    const possibleHouseCardToRemove =
      this.props.gameState.possibleEnemyHouseCards;
    return (
      <>
        {this.simpleChoice && (
          <Col xs={12} className="text-center">
            <Trans
              i18nKey="robertArrynAbility.robertArrynHouseMayRemoveRobertArrynAndFrom7f91f9"
              components={{
                element0: <b />,
                element1: <b />,
                value2: <>{this.house.name}</>,
                element3: <b />,
                value4: (
                  <>
                    {joinReactNodes(
                      possibleHouseCardToRemove.map((hc) => (
                        <b key={`robert-arryn_${hc.id}`}>{hc.name}</b>
                      )),
                      t("robertArrynAbility.ore1a3e7")
                    )}
                  </>
                )
              }}
            />
          </Col>
        )}
        {this.selectHouseCard && (
          <Col xs={12} className="text-center">
            <Trans
              i18nKey="robertArrynAbility.robertArrynHouseHasToDecideWhichHouseCard2f8b3b"
              components={{
                element0: <b />,
                element1: <b />,
                value2: <>{this.house.name}</>
              }}
            />
          </Col>
        )}
        {renderChildGameState(this.props, [
          [SimpleChoiceGameState, SimpleChoiceComponent],
          [SelectHouseCardGameState, SelectHouseCardComponent]
        ])}
      </>
    );
  }
}
