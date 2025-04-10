import * as React from "react";
import { Component, ReactNode } from "react";
import Card from "react-bootstrap/Card";
import ListGroup from "react-bootstrap/ListGroup";
import ListGroupItem from "react-bootstrap/ListGroupItem";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import podiumWinnerImage from "../../public/images/icons/podium-winner.svg";
import SupplyTrackComponent from "./game-state-panel/utils/SupplyTrackComponent";
import HouseSnapshotComponent from "./HouseSnapshotComponent";
import BetterMap from "../utils/BetterMap";
import GameClient from "./GameClient";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import { GameSnapshot } from "../common/ingame-game-state/game-data-structure/Game";
import House from "../common/ingame-game-state/game-data-structure/House";
import HouseCard from "../common/ingame-game-state/game-data-structure/house-card/HouseCard";
import ColumnSwapButton from "./game-state-panel/utils/ColumnSwapButton";
import { faStar } from "@fortawesome/free-solid-svg-icons";
import _ from "lodash";
import { Row, Col } from "react-bootstrap";
import SimpleInfluenceIconComponent from "./game-state-panel/utils/SimpleInfluenceIconComponent";
import stoneThroneImage from "../../public/images/icons/stone-throne.svg";
import diamondHiltImage from "../../public/images/icons/diamond-hilt.svg";
import diamondHiltUsedImage from "../../public/images/icons/diamond-hilt-used.svg";
import ravenImage from "../../public/images/icons/raven.svg";

interface ReplayHouseInfoColumnProps {
  gameClient: GameClient;
  ingame: IngameGameState;
  gameSnapshot: GameSnapshot | undefined;
  onColumnSwapClick: () => void;
}

export default class ReplayHouseInfoColumn extends Component<ReplayHouseInfoColumnProps> {
  private gameSnapshot = this.props.gameSnapshot;
  private ingame = this.props.ingame;
  private gameClient = this.props.gameClient;

  get tracks(): { track: (House | null)[]; stars: boolean }[] {
    if (!this.gameSnapshot) {
      return [];
    }
    const ironThrone = this.gameSnapshot.ironThroneTrack.map((h) =>
      this.ingame.game.houses.get(h)
    );
    const fiefdoms = this.gameSnapshot.fiefdomsTrack.map((h) =>
      this.ingame.game.houses.get(h)
    );
    const kingsCourt = this.gameSnapshot.kingsCourtTrack.map((h) =>
      this.ingame.game.houses.get(h)
    );

    // Todo: enable temporary tracks for replaying Draft and CoK states

    return [
      { track: ironThrone, stars: false },
      { track: fiefdoms, stars: false },
      { track: kingsCourt, stars: true },
    ];
  }

  render(): ReactNode {
    if (!this.gameSnapshot) {
      return null;
    }

    const houses = new BetterMap(
      this.gameSnapshot.housesOnVictoryTrack.map((houseData) => {
        const realHouse = this.ingame.game.houses.get(houseData.id);
        const houseForReplay = new House(
          realHouse.id,
          realHouse.name,
          realHouse.color,
          realHouse.unitLimits,
          houseData.powerTokens,
          realHouse.maxPowerTokens,
          houseData.supply,
          new BetterMap(
            houseData.houseCards.map((hcData) => {
              const hc = new HouseCard(
                hcData.id,
                "",
                0,
                0,
                0,
                null,
                realHouse.id
              );
              hc.state = hcData.state;
              return [hc.id, hc];
            })
          ),
          null,
          houseData.victoryPoints,
          realHouse.hasBeenReplacedByVassal
        );
        return [houseData, houseForReplay];
      })
    );

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
            {this.renderInfluenceTracks()}
            <ListGroupItem style={{ minHeight: "130px" }}>
              <SupplyTrackComponent
                gameClient={this.props.gameClient}
                supplyRestrictions={this.ingame.game.supplyRestrictions}
                houses={houses.values}
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
                <OverlayTrigger
                  overlay={
                    <Tooltip
                      id="cancel-game-vote-tooltip"
                      className="tooltip-w-100"
                    >
                      The houses info list is always reordered by score and thus
                      acts as the victory track.
                      <br />
                      If you hover the mouse pointer over the victory point
                      counter, a tooltip appears
                      <br />
                      that shows you the total number of land areas, which is
                      important for breaking ties.
                    </Tooltip>
                  }
                  placement="top"
                >
                  <img src={podiumWinnerImage} width={40} />
                </OverlayTrigger>
              </ListGroupItem>
              {houses.entries.map(([data, h]) => (
                <HouseSnapshotComponent
                  key={`house-row_${h.id}`}
                  gameClient={this.props.gameClient}
                  ingame={this.props.ingame}
                  house={h}
                  totalLandAreas={data.landAreaCount}
                  isVassal={data.isVassal}
                  suzerainHouseId={data.suzerainHouseId}
                />
              ))}
            </ListGroup>
          </Card.Body>
        </Card>
      </div>
    );
  }

  private renderInfluenceTracks(): React.ReactNode {
    return this.tracks.map(({ track, stars }, i) => (
      <ListGroupItem
        key={`influence-track-container_${i}`}
        style={{ minHeight: "61px" }}
      >
        <Row className="align-items-center">
          <Col xs="auto" className="text-center" style={{ width: "46px" }}>
            <OverlayTrigger
              overlay={
                <Tooltip id={`tooltip-tracker-${i}`}>
                  {i == 0 ? (
                    <>
                      <b>Iron Throne Track</b>
                      <br />
                      All ties (except military ones) are decided by the holder
                      of the Iron Throne.
                      <br />
                      Turn order is decided by this tracker.
                    </>
                  ) : i == 1 ? (
                    <>
                      <b>Fiefdoms Track</b>
                      <br />
                      Once per round, the holder of Valyrian Steel Blade can use
                      the blade to increase by one the combat strength of his
                      army in a combat.
                      <br />
                      In case of a tie in a combat, the winner is the house
                      which is the highest in this tracker.
                      <br />
                      <br />
                      {this.gameSnapshot?.vsbUsed ? (
                        <>The Valyrian Steel Blade has been used this round.</>
                      ) : (
                        <>The Valyrian Steel Blade is available.</>
                      )}
                    </>
                  ) : (
                    <>
                      <b>Kings&apos;s Court Track</b>
                      <br />
                      At the end of the Planning Phase, the holder of the Raven
                      may choose to either change one of his placed order, or to
                      look at the top card of the Wildling deck and decide
                      whether to leave it at the top or to place it at the
                      bottom of the deck.
                    </>
                  )}
                </Tooltip>
              }
              placement="right"
            >
              <img
                src={
                  i == 0
                    ? stoneThroneImage
                    : i == 1
                      ? this.gameSnapshot?.vsbUsed
                        ? diamondHiltUsedImage
                        : diamondHiltImage
                      : ravenImage
                }
                width={32}
              />
            </OverlayTrigger>
          </Col>
          {track.map((h, j) => (
            <Col xs="auto" key={`influence-track_${i}_${h?.id ?? j}`}>
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
            </Col>
          ))}
        </Row>
      </ListGroupItem>
    ));
  }
}
