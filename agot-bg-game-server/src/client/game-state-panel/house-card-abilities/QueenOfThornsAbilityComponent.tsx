import { t, Trans } from "../../i18n";
import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import QueenOfThornsAbilityGameState from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/queen-of-thorns-ability-game-state/QueenOfThornsAbilityGameState";
import renderChildGameState from "../../utils/renderChildGameState";
import SelectOrdersGameState from "../../../common/ingame-game-state/select-orders-game-state/SelectOrdersGameState";
import SelectOrdersComponent from "../SelectOrdersComponent";
import React from "react";
import Col from "react-bootstrap/Col";

@observer
export default class QueenOfThornsAbilityComponent extends Component<
  GameStateComponentProps<QueenOfThornsAbilityGameState>
> {
  get removingOrderInEmbattledAreaAllowed(): boolean {
    return this.props.gameState.childGameState.possibleRegions.includes(
      this.props.gameState.parentGameState.parentGameState.combatGameState
        .defendingRegion
    );
  }

  render(): ReactNode {
    return (
      <>
        <Col xs={12} className="text-center">
          <Trans
            i18nKey="queenOfThornsAbility.queenOfThornsHouseMustRemoveAnEnemyOrder17fa9c"
            components={{
              element0: <b />,
              element1: <b />,
              value2: <>{this.props.gameState.childGameState.house.name}</>,
              value3: (
                <>
                  {this.removingOrderInEmbattledAreaAllowed
                    ? t("queenOfThornsAbility.eitherInTheEmbattledAreaOr7b757d")
                    : ""}
                </>
              )
            }}
          />
        </Col>
        {renderChildGameState(this.props, [
          [SelectOrdersGameState, SelectOrdersComponent]
        ])}
      </>
    );
  }
}
