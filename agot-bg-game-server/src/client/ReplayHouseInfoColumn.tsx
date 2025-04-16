import * as React from "react";
import { Component, ReactNode } from "react";
import Card from "react-bootstrap/Card";
import ListGroup from "react-bootstrap/ListGroup";
import ListGroupItem from "react-bootstrap/ListGroupItem";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import podiumWinnerImage from "../../public/images/icons/podium-winner.svg";
import HouseSnapshotComponent from "./HouseSnapshotComponent";
import GameClient from "./GameClient";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import ColumnSwapButton from "./game-state-panel/utils/ColumnSwapButton";
import { faStar } from "@fortawesome/free-solid-svg-icons";
import _ from "lodash";
import { Row, Col } from "react-bootstrap";
import SimpleInfluenceIconComponent from "./game-state-panel/utils/SimpleInfluenceIconComponent";
import stoneThroneImage from "../../public/images/icons/stone-throne.svg";
import diamondHiltImage from "../../public/images/icons/diamond-hilt.svg";
import diamondHiltUsedImage from "../../public/images/icons/diamond-hilt-used.svg";
import ravenImage from "../../public/images/icons/raven.svg";
import { observer } from "mobx-react";
import GameSnapshot from "./game-replay/GameSnapshot";
import ReplaySupplyTrackComponent from "./game-state-panel/utils/ReplaySupplyTrackComponent";
import HouseSnapshot from "./game-replay/HouseSnapshot";

interface ReplayHouseInfoColumnProps {
  gameClient: GameClient;
  ingame: IngameGameState;
  onColumnSwapClick: () => void;
}

@observer
export default class ReplayHouseInfoColumn extends Component<ReplayHouseInfoColumnProps> {
  private ingame = this.props.ingame;
  private gameClient = this.props.gameClient;

  getTracks(): { track: HouseSnapshot[]; stars: boolean }[] {
    const entireSnap = this.ingame.replayManager.selectedSnapshot;
    const snap = entireSnap?.gameSnapshot;
    if (!snap) {
      return [];
    }
    const ironThrone = snap.ironThroneTrack.map((h) => entireSnap.getHouse(h));
    const fiefdoms = snap.fiefdomsTrack.map((h) => entireSnap.getHouse(h));
    const kingsCourt = snap.kingsCourtTrack.map((h) => entireSnap.getHouse(h));

    // Todo: enable temporary tracks for replaying Draft and CoK states
    return [
      { track: ironThrone, stars: false },
      { track: fiefdoms, stars: false },
      { track: kingsCourt, stars: true },
    ];
  }

  render(): ReactNode {
    const gameSnapshot =
      this.ingame.replayManager.selectedSnapshot?.gameSnapshot;
    if (!gameSnapshot) {
      return null;
    }

    return (
      <div
        className={
          this.gameClient.isMapScrollbarSet ? "flex-ratio-container" : ""
        }
      >
        <Card
          className={
            this.gameClient.isMapScrollbarSet
              ? "flex-sized-to-content mb-2"
              : ""
          }
        >
          <ListGroup variant="flush">
            {this.renderInfluenceTracks(gameSnapshot)}
            <ListGroupItem style={{ minHeight: "130px" }}>
              <ReplaySupplyTrackComponent
                supplyRestrictions={this.ingame.game.supplyRestrictions}
                houses={gameSnapshot.housesOnVictoryTrack}
              />
            </ListGroupItem>
          </ListGroup>
          <ColumnSwapButton onClick={this.props.onColumnSwapClick} />
        </Card>
        <Card
          className={
            this.gameClient.isMapScrollbarSet ? "flex-fill-remaining" : ""
          }
        >
          <Card.Body id="houses-panel" className="no-space-around">
            <ListGroup variant="flush">
              <ListGroupItem className="d-flex justify-content-center p-2">
                <img src={podiumWinnerImage} width={40} />
              </ListGroupItem>
              {gameSnapshot.housesOnVictoryTrack.map((house) => (
                <HouseSnapshotComponent
                  key={`house-row_${house.id}`}
                  gameClient={this.props.gameClient}
                  ingame={this.props.ingame}
                  house={house}
                />
              ))}
            </ListGroup>
          </Card.Body>
        </Card>
      </div>
    );
  }

  private renderInfluenceTracks(snap: GameSnapshot): React.ReactNode {
    return this.getTracks().map(({ track, stars }, i) => (
      <ListGroupItem
        key={`influence-track-container_${i}`}
        style={{ minHeight: "61px" }}
      >
        <Row className="align-items-center">
          <Col xs="auto" className="text-center" style={{ width: "46px" }}>
            <img
              src={
                i == 0
                  ? stoneThroneImage
                  : i == 1
                    ? snap.vsbUsed
                      ? diamondHiltUsedImage
                      : diamondHiltImage
                    : ravenImage
              }
              width={32}
            />
          </Col>
          {this.renderTrack(track, i, stars)}
        </Row>
      </ListGroupItem>
    ));
  }

  private renderTrack(
    track: HouseSnapshot[],
    i: number,
    stars: boolean
  ): React.ReactNode {
    const totalHouses = this.ingame.game.houses.size;
    const filledTrack: (HouseSnapshot | null)[] = [...track];

    // Fill the track with null placeholders if it's shorter than total houses
    while (filledTrack.length < totalHouses) {
      filledTrack.push(null);
    }

    return filledTrack.map((h, j) => (
      <Col
        xs="auto"
        key={`influence-track_${i}_${h?.id ?? `placeholder_${j}`}`}
      >
        {h ? (
          <>
            <SimpleInfluenceIconComponent house={h} />
            <div className="tracker-star-container">
              {stars &&
                _.range(0, this.ingame.game.starredOrderRestrictions[j]).map(
                  (k) => (
                    <div key={`stars_${h?.id ?? j}_${k}`}>
                      <FontAwesomeIcon
                        style={{ color: "#ffc107", fontSize: "9px" }}
                        icon={faStar}
                      />
                    </div>
                  )
                )}
            </div>
          </>
        ) : (
          // Invisible placeholder
          <div
            style={{ visibility: "hidden", width: "36px", height: "36px" }}
          />
        )}
      </Col>
    ));
  }
}
