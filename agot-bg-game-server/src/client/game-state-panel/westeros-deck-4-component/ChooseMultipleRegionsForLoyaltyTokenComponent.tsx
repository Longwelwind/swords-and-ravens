import { Trans } from "../../i18n";
import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import ChooseMultipleRegionsForLoyaltyTokenGameState from "../../../common/ingame-game-state/westeros-game-state/westeros-deck-4-game-state/choose-multiple-regions-for-loyalty-token-game-state/ChooseMultipleRegionsForLoyaltyTokenGameState";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import SelectRegionGameState from "../../../common/ingame-game-state/select-region-game-state/SelectRegionGameState";
import SelectRegionComponent from "../SelectRegionComponent";
import { Col } from "react-bootstrap";

@observer
export default class ChooseMultipleRegionsForLoyaltyTokenComponent extends Component<
  GameStateComponentProps<ChooseMultipleRegionsForLoyaltyTokenGameState>
> {
  render(): ReactNode {
    return (
      <>
        {this.props.gameState.childGameState instanceof
          SelectRegionGameState && (
          <Col className="text-center">
            <Trans
              i18nKey="chooseMultipleRegionsForLoyaltyToken.houseMustChooseRegionsToPlaceLoyaltyTokens51dd05"
              values={{
                childGameStateHouse:
                  this.props.gameState.childGameState.house.name
              }}
              components={{
                bold: <b />
              }}
            />
          </Col>
        )}
        {renderChildGameState(this.props, [
          [SimpleChoiceGameState, SimpleChoiceComponent],
          [SelectRegionGameState, SelectRegionComponent]
        ])}
      </>
    );
  }
}
