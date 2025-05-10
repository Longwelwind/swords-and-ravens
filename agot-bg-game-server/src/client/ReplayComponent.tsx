import * as React from "react";
import { Component, ReactNode } from "react";
import { observer } from "mobx-react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";

import IngameGameState from "../common/ingame-game-state/IngameGameState";
import { MAP_HEIGHT } from "./MapComponent";
import GameClient from "./GameClient";
import User from "../server/User";
import { observable } from "mobx";
import { GameSettings } from "../common/GameSettings";
import houseCardsBackImages from "./houseCardsBackImages";
import houseInfluenceImages from "./houseInfluenceImages";
import houseOrderImages from "./houseOrderImages";
import housePowerTokensImages from "./housePowerTokensImages";
import unitImages from "./unitImages";
import houseIconImages from "./houseIconImages";
import WorldSnapshotComponent from "./WorldSnapshotComponent";
import { houseColorFilters } from "./houseColorFilters";
import ReplayGameStateColumn from "./ReplayGameStateColumn";
import ReplayHouseInfoColumn from "./ReplayHouseInfoColumn";

interface ReplayComponentProps {
  gameClient: GameClient;
  ingame: IngameGameState;
}

@observer
export default class ReplayComponent extends Component<ReplayComponentProps> {
  private gameClient: GameClient = this.props.gameClient;
  private ingame: IngameGameState = this.props.ingame;
  private gameSettings: GameSettings = this.ingame.entireGame.gameSettings;
  private user: User | null = this.gameClient.authenticatedUser;

  @observable currentOpenedTab = "game-logs";
  @observable columnSwapAnimationClassName = "";

  constructor(props: ReplayComponentProps) {
    super(props);
    // Check for Dance with Dragons house cards
    if (props.ingame.entireGame.gameSettings.adwdHouseCards) {
      // Replace Stark images with Bolton images for DwD
      houseCardsBackImages.set("stark", houseCardsBackImages.get("bolton"));
      houseInfluenceImages.set("stark", houseInfluenceImages.get("bolton"));
      houseOrderImages.set("stark", houseOrderImages.get("bolton"));
      housePowerTokensImages.set("stark", housePowerTokensImages.get("bolton"));
      unitImages.set("stark", unitImages.get("bolton"));
      houseIconImages.set("stark", houseIconImages.get("bolton"));
      houseColorFilters.set("stark", houseColorFilters.get("bolton"));
    }
  }

  render(): ReactNode {
    const columnOrders = this.user?.settings.gameStateColumnRight
      ? { housesInfosColumn: 1, mapColumn: 2, gameStateColumn: 3 }
      : { gameStateColumn: 1, mapColumn: 2, housesInfosColumn: 3 };

    const col1MinWidth = this.gameSettings.playerCount >= 8 ? "485px" : "470px";

    return (
      <Row
        className="justify-content-center"
        style={{
          maxHeight: this.gameClient.isMapScrollbarSet ? "95vh" : "none",
        }}
      >
        <Col
          xs={{ order: columnOrders.gameStateColumn }}
          className={this.columnSwapAnimationClassName}
          style={{
            maxHeight: this.gameClient.isMapScrollbarSet ? "100%" : "none",
            minWidth: col1MinWidth,
            maxWidth: "800px",
          }}
        >
          <ReplayGameStateColumn
            gameClient={this.gameClient}
            ingame={this.ingame}
            currentOpenedTab={this.currentOpenedTab}
            onTabChange={(tab) => (this.currentOpenedTab = tab)}
            onColumnSwapClick={() => this.onColumnSwap()}
          />
        </Col>
        <Col
          xs={{ span: "auto", order: columnOrders.mapColumn }}
          style={{
            maxHeight: this.gameClient.isMapScrollbarSet ? "100%" : "none",
          }}
        >
          <div
            id="map-component"
            style={{
              height: this.gameClient.isMapScrollbarSet ? "100%" : "auto",
              overflowY: "auto",
              overflowX: "hidden",
              maxHeight: MAP_HEIGHT,
            }}
          >
            <WorldSnapshotComponent ingameGameState={this.ingame} />
          </div>
        </Col>
        <Col
          xs={{ span: "auto", order: columnOrders.housesInfosColumn }}
          className={this.columnSwapAnimationClassName}
          style={{
            maxHeight: this.gameClient.isMapScrollbarSet ? "100%" : "none",
          }}
        >
          <ReplayHouseInfoColumn
            gameClient={this.gameClient}
            ingame={this.ingame}
            onColumnSwapClick={() => this.onColumnSwap()}
          />
        </Col>
      </Row>
    );
  }

  private onColumnSwap(): void {
    if (!this.user || this.columnSwapAnimationClassName !== "") return;
    this.columnSwapAnimationClassName = "animate__animated animate__fadeIn";
    this.user.settings.gameStateColumnRight =
      !this.user.settings.gameStateColumnRight;
    window.setTimeout(() => (this.columnSwapAnimationClassName = ""), 2050);
  }
}
