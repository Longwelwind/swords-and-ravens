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
import ExpertArtificerGameState from "../../common/ingame-game-state/action-game-state/resolve-consolidate-power-game-state/execute-loan-game-state/expert-artificer-game-state/ExpertArtificerGameState";

@observer
export default class ExpertArtificerComponent extends Component<
  GameStateComponentProps<ExpertArtificerGameState>
> {
  get house(): House {
    return this.props.gameState.childGameState.house;
  }

  render(): ReactNode {
    return this.props.gameClient.doesControlHouse(this.house) ? (
      <>
        <Col xs={12} className="text-center">
          {t("expertArtificer.selectAnAreaToPlaceACrowna092eb")}
        </Col>
        {renderChildGameState(this.props, [
          [SelectRegionGameState, SelectRegionComponent]
        ])}
      </>
    ) : (
      <Col xs={12} className="text-center">
        <Trans
          i18nKey="common.waitingFor"
          components={{ houses: <>{this.house.name}</> }}
        />
      </Col>
    );
  }
}
