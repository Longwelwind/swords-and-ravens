import { Trans } from "../../i18n";
import { observer } from "mobx-react";
import React, { Component, ReactNode } from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import PlayingWithFireGameState from "../../../common/ingame-game-state/westeros-game-state/westeros-deck-4-game-state/playing-with-fire-game-state/PlayingWithFireGameState";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import SelectRegionGameState from "../../../common/ingame-game-state/select-region-game-state/SelectRegionGameState";
import SelectRegionComponent from "../SelectRegionComponent";
import { Col } from "react-bootstrap";
import { RegionOnMapProperties } from "../../../client/MapControls";
import Region from "../../../common/ingame-game-state/game-data-structure/Region";
import PartialRecursive from "../../../utils/PartialRecursive";
import MapContribution from "../../../client/MapContribution";

@observer
export default class PlayingWithFireComponent extends Component<
  GameStateComponentProps<PlayingWithFireGameState>
> {
  render(): ReactNode {
    return (
      <>
        <MapContribution
          mapControls={this.props.mapControls}
          gameState={this.props.gameState}
          regions={this.modifyRegionsOnMap()}
        />
        {this.props.gameState.childGameState instanceof
          SelectRegionGameState && (
          <Col className="text-center">
            <Trans
              i18nKey="common.houseMustChooseAnAreaToPlaceALoyalty"
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

  modifyRegionsOnMap(): [Region, PartialRecursive<RegionOnMapProperties>][] {
    if (!this.props.gameState.region) {
      return [];
    }
    return [
      [
        this.props.gameState.region,
        {
          highlight: {
            active: true,
            color:
              this.props.gameState.ingame.game.targaryen?.getHighlightColor() ??
              "#800080"
          }
        }
      ]
    ];
  }
}
