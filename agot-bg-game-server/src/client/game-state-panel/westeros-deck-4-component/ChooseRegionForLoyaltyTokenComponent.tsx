import { Trans } from "../../i18n";
import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import ChooseRegionForLoyaltyTokenGameState from "../../../common/ingame-game-state/westeros-game-state/westeros-deck-4-game-state/choose-region-for-loyalty-token-game-state/ChooseRegionForLoyaltyTokenGameState";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import SelectRegionGameState from "../../../common/ingame-game-state/select-region-game-state/SelectRegionGameState";
import SelectRegionComponent from "../SelectRegionComponent";
import { Col } from "react-bootstrap";

@observer
export default class ChooseRegionForLoyaltyTokenComponent extends Component<
  GameStateComponentProps<ChooseRegionForLoyaltyTokenGameState>
> {
  render(): ReactNode {
    return (
      <>
        {this.props.gameState.childGameState instanceof
          SelectRegionGameState && (
          <Col className="text-center">
            <Trans
              i18nKey="common.houseMustChooseAnAreaToPlaceALoyalty"
              components={{
                element0: <b />,
                value1: <>{this.props.gameState.childGameState.house.name}</>
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
