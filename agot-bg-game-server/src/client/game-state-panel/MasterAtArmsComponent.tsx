import { t, Trans } from "../i18n";
import { Component, ReactNode } from "react";
import React from "react";
import { observer } from "mobx-react";
import Col from "react-bootstrap/Col";
import GameStateComponentProps from "./GameStateComponentProps";
import House from "../../common/ingame-game-state/game-data-structure/House";
import renderChildGameState from "../utils/renderChildGameState";
import SelectRegionGameState from "../../common/ingame-game-state/select-region-game-state/SelectRegionGameState";
import SelectRegionComponent from "./SelectRegionComponent";
import MasterAtArmsGameState from "../../common/ingame-game-state/action-game-state/resolve-consolidate-power-game-state/execute-loan-game-state/master-at-arms-game-state/MasterAtArmsGameState";

@observer
export default class MasterAtArmsComponent extends Component<
  GameStateComponentProps<MasterAtArmsGameState>
> {
  get house(): House {
    return this.props.gameState.childGameState.house;
  }

  render(): ReactNode {
    return this.props.gameClient.doesControlHouse(this.house) ? (
      <>
        <Col xs={12} className="text-center">
          {t("masterAtArms.selectACastleToBeUpgradedIntoAStrongholde38e39")}
        </Col>
        {renderChildGameState(this.props, [
          [SelectRegionGameState, SelectRegionComponent]
        ])}
      </>
    ) : (
      <Col xs={12} className="text-center">
        <Trans
          i18nKey="common.waitingFor"
          values={{ houses: this.house.name }}
        />
      </Col>
    );
  }
}
