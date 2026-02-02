import { observer } from "mobx-react";
import ClashOfKingsGameState from "../../common/ingame-game-state/westeros-game-state/clash-of-kings-game-state/ClashOfKingsGameState";
import { Component, ReactNode, Fragment } from "react";
import BiddingGameState from "../../common/ingame-game-state/westeros-game-state/bidding-game-state/BiddingGameState";
import BiddingComponent from "./BiddingComponent";
import ResolveTiesGameState from "../../common/ingame-game-state/westeros-game-state/clash-of-kings-game-state/resolve-ties-game-state/ResolveTiesGameState";
import * as React from "react";
import ResolveTiesComponent from "./ResolveTiesComponent";
import renderChildGameState from "../utils/renderChildGameState";
import GameStateComponentProps from "./GameStateComponentProps";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import DistributePowerTokensGameState from "../../common/ingame-game-state/westeros-game-state/clash-of-kings-game-state/distribute-power-tokens-game-state/DistributePowerTokensGameState";
import DistributePowerTokensComponent from "./DistributePowerTokensComponent";
import stoneThroneImage from "../../../public/images/icons/stone-throne.svg";
import ravenImage from "../../../public/images/icons/raven.svg";
import diamondHiltImage from "../../../public/images/icons/diamond-hilt.svg";

@observer
export default class ClashOfKingsComponent extends Component<
  GameStateComponentProps<ClashOfKingsGameState>
> {
  render(): ReactNode {
    const currentTrackI = this.props.gameState.currentTrackI;
    const image =
      currentTrackI == 0
        ? stoneThroneImage
        : currentTrackI == 1
          ? diamondHiltImage
          : ravenImage;

    return (
      <>
        <Row className="justify-content-center mt-2 mb-1">
          <img src={image} width="40px" className="mr-2" />
          <h4 className="mt-2">Clash of Kings</h4>
          <img src={image} width="40px" className="ml-2" />
        </Row>
        <Row className="justify-content-center">
          <Col xs={12} className="text-center">
            Houses bid for the{" "}
            <strong>
              {this.props.gameState.game.getNameInfluenceTrack(currentTrackI)}
            </strong>{" "}
            track.
          </Col>
          <Fragment key={`clash-of-kings-comp_${currentTrackI}`}>
            {renderChildGameState(this.props, [
              [BiddingGameState, BiddingComponent],
              [ResolveTiesGameState, ResolveTiesComponent],
              [DistributePowerTokensGameState, DistributePowerTokensComponent],
            ])}
          </Fragment>
        </Row>
      </>
    );
  }
}
