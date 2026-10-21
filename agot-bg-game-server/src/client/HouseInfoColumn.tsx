import { t, Trans } from "./i18n";
import React, { Component, ReactNode } from "react";
import {
  Col,
  Row,
  Card,
  ListGroup,
  ListGroupItem,
  OverlayTrigger,
  Tooltip
} from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar } from "@fortawesome/free-solid-svg-icons";
import _ from "lodash";

import IngameGameState from "../common/ingame-game-state/IngameGameState";
import GameClient from "./GameClient";
import MapControls from "./MapControls";
import User from "../server/User";
import { InfluenceTrackDetails } from "./IngameComponent";
import { OverlayChildren } from "react-bootstrap/Overlay";

import ColumnSwapButton from "./game-state-panel/utils/ColumnSwapButton";

import SupplyTrackComponent from "./game-state-panel/utils/SupplyTrackComponent";
import getUserLinkOrLabel from "./utils/getIngameUserLinkOrLabel";
import InfluenceIconComponent from "./game-state-panel/utils/InfluenceIconComponent";
import HouseRowComponent from "./HouseRowComponent";

import settingsKnobsImage from "../../public/images/icons/settings-knobs.svg";
import speakerImage from "../../public/images/icons/speaker.svg";
import speakerOffImage from "../../public/images/icons/speaker-off.svg";
import stoneThroneImage from "../../public/images/icons/stone-throne.svg";
import diamondHiltImage from "../../public/images/icons/diamond-hilt.svg";
import diamondHiltUsedImage from "../../public/images/icons/diamond-hilt-used.svg";
import ravenImage from "../../public/images/icons/raven.svg";
import podiumWinnerImage from "../../public/images/icons/podium-winner.svg";
import { observer } from "mobx-react";

interface HouseInfoColumnProps {
  ingame: IngameGameState;
  gameClient: GameClient;
  mapControls: MapControls;
  tracks: InfluenceTrackDetails[];
  gameControlsPopover: OverlayChildren;
  onColumnSwapClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  showGameControls?: boolean;
}

@observer
export default class HouseInfoColumn extends Component<HouseInfoColumnProps> {
  private gameClient = this.props.gameClient;

  private ingame = this.props.ingame;
  private game = this.props.ingame.game;

  render(): ReactNode {
    const bannedUsers = this.getBannedUsers();
    const connectedSpectators = _.difference(
      this.getConnectedSpectators(),
      bannedUsers
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
            {this.renderInfluenceTracks(this.props.tracks)}
            <ListGroupItem style={{ minHeight: "130px" }}>
              <SupplyTrackComponent
                supplyRestrictions={this.game.supplyRestrictions}
                houses={this.game.houses.values}
                ingame={this.ingame}
                gameClient={this.gameClient}
                mapControls={this.props.mapControls}
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
                      <Trans
                        i18nKey="houseInfoColumn.theHousesInfoListIsAlwaysReorderedByScoreadbbe7"
                        components={{ element0: <br />, element1: <br /> }}
                      />
                    </Tooltip>
                  }
                  placement="top"
                >
                  <img src={podiumWinnerImage} width={40} />
                </OverlayTrigger>
              </ListGroupItem>
              {this.gameClient.getPotentialWinners().map((h) => (
                <HouseRowComponent
                  key={`house-row_${h.id}`}
                  gameClient={this.gameClient}
                  ingame={this.ingame}
                  house={h}
                  mapControls={this.props.mapControls}
                />
              ))}
              <ListGroupItem className="fst-italic">
                {connectedSpectators.length > 0 ? (
                  <>
                    <Row className="justify-content-center">
                      <Col xs="auto">{t("common.spectators")}</Col>
                    </Row>
                    <Row
                      className="justify-content-center"
                      style={{ maxWidth: 500 }}
                    >
                      {connectedSpectators.map((u) => (
                        <Col xs="auto" key={`specatator_${u.id}`}>
                          <b>
                            {getUserLinkOrLabel(
                              u,
                              false,
                              this.gameClient.canActAsOwner()
                            )}
                          </b>
                        </Col>
                      ))}
                    </Row>
                  </>
                ) : (
                  <Row className="justify-content-center">
                    <Col xs="auto">
                      {t("houseInfoColumn.noSpectatorsabba41")}
                    </Col>
                  </Row>
                )}
              </ListGroupItem>
              {bannedUsers.length > 0 && (
                <ListGroupItem className="fst-italic">
                  <Row className="justify-content-center">
                    <Col xs="auto">
                      {t("houseInfoColumn.bannedUsersfe6569")}
                    </Col>
                  </Row>
                  <Row
                    className="justify-content-center"
                    style={{ maxWidth: 500 }}
                  >
                    {bannedUsers.map((u) => (
                      <Col xs="auto" key={`banned_${u.id}`}>
                        <b>{getUserLinkOrLabel(u)}</b>
                        {this.gameClient.canActAsOwner() && (
                          <button
                            type="button"
                            className="icon-button ms-1"
                            style={{ float: "none" }}
                            onClick={() => this.unbanUser(u)}
                          >
                            <span>&#x2713;</span>
                          </button>
                        )}
                      </Col>
                    ))}
                  </Row>
                </ListGroupItem>
              )}
            </ListGroup>
          </Card.Body>
        </Card>
        {this.props.showGameControls && this.renderGameControlsRow()}
      </div>
    );
  }

  private renderInfluenceTracks(
    tracks: InfluenceTrackDetails[]
  ): React.ReactNode {
    return tracks.map(({ trackToShow, realTrack, stars }, i) => (
      <ListGroupItem
        key={`influence-track-container_${i}`}
        style={{ minHeight: "61px" }}
      >
        <Row className="align-items-center d-flex flex-nowrap">
          <Col xs="auto" className="text-center" style={{ width: "46px" }}>
            <OverlayTrigger
              overlay={
                <Tooltip id={`tooltip-tracker-${i}`}>
                  {i == 0 ? (
                    <>
                      <Trans
                        i18nKey="houseInfoColumn.ironThroneTrackAllTiesExceptMilitaryOnesAre6b30b5"
                        components={{
                          element0: <b />,
                          element1: <br />,
                          element2: <br />
                        }}
                      />
                    </>
                  ) : i == 1 ? (
                    <>
                      <Trans
                        i18nKey="houseInfoColumn.fiefdomsTrackOncePerRoundTheHolderOfValyrianbce67a"
                        components={{
                          element0: <b />,
                          element1: <br />,
                          element2: <br />,
                          element3: <br />,
                          element4: <br />,
                          value5: (
                            <>
                              {this.game.valyrianSteelBladeUsed ? (
                                <>
                                  {t(
                                    "houseInfoColumn.theValyrianSteelBladeHasBeenUsedThisRoundb9af41"
                                  )}
                                </>
                              ) : (
                                <>
                                  {t(
                                    "houseInfoColumn.theValyrianSteelBladeIsAvailablef2bb4f"
                                  )}
                                </>
                              )}
                            </>
                          )
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <Trans
                        i18nKey="houseInfoColumn.kingsSCourtTrackAtTheEndOfThed57382"
                        components={{ element0: <b />, element1: <br /> }}
                      />
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
                      ? this.game.valyrianSteelBladeUsed
                        ? diamondHiltUsedImage
                        : diamondHiltImage
                      : ravenImage
                }
                width={32}
              />
            </OverlayTrigger>
          </Col>
          {trackToShow.map((h, j) => (
            <Col xs="auto" key={`influence-track_${i}_${h?.id ?? j}`}>
              <InfluenceIconComponent
                house={h}
                ingame={this.ingame}
                track={realTrack}
                trackIndex={i}
              />
              <div className="tracker-star-container">
                {stars &&
                  _.range(0, this.game.starredOrderRestrictions[j]).map((k) => (
                    <div key={`stars_${h?.id ?? j}_${k}`}>
                      <FontAwesomeIcon
                        style={{ color: "#ffc107", fontSize: "9px" }}
                        icon={faStar}
                      />
                    </div>
                  ))}
              </div>
            </Col>
          ))}
        </Row>
      </ListGroupItem>
    ));
  }

  private getConnectedSpectators(): User[] {
    return _.difference(
      this.ingame.entireGame.users.values.filter((u) => u.connected),
      this.ingame.players.keys
    );
  }

  private getBannedUsers(): User[] {
    return Array.from(this.ingame.bannedUsers.values())
      .filter((uid) => this.ingame.entireGame.users.has(uid))
      .map((uid) => this.ingame.entireGame.users.get(uid));
  }

  private unbanUser(user: User): void {
    if (this.gameClient.canActAsOwner()) {
      if (
        !window.confirm(
          t("houseInfoColumn.areYouSureYouWantToUnband3897e", {
            value0: user.name
          })
        )
      ) {
        return;
      }

      this.ingame.entireGame.sendMessageToServer({
        type: "unban-user",
        userId: user.id
      });
    }
  }

  private renderGameControlsRow(): React.ReactNode {
    return (
      <Row
        className={
          this.gameClient.isMapScrollbarSet ? "flex-footer mt-2" : "mt-2"
        }
        id="game-controls"
      >
        <Col xs="auto">
          <div className="btn btn-outline-light btn-sm">
            <OverlayTrigger
              overlay={this.props.gameControlsPopover}
              placement="top"
              trigger="click"
              rootClose
            >
              <img src={settingsKnobsImage} width={32} />
            </OverlayTrigger>
          </div>
        </Col>
        <Col xs="auto">
          <button
            type="button"
            className="btn btn-outline-light btn-sm"
            onClick={() => (this.gameClient.muted = !this.gameClient.muted)}
          >
            <OverlayTrigger
              placement="auto"
              overlay={
                <Tooltip id="house-info-mute-tooltip">
                  {this.gameClient.muted
                    ? t("common.unmute")
                    : t("common.mute")}
                </Tooltip>
              }
            >
              <img
                src={this.gameClient.muted ? speakerOffImage : speakerImage}
                width={32}
              />
            </OverlayTrigger>
          </button>
        </Col>
      </Row>
    );
  }
}
