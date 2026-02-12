import * as React from "react";
import { Component, ReactNode } from "react";
import { observer } from "mobx-react";
import { observable } from "mobx";
import {
  Button,
  FormCheck,
  Modal,
  Popover,
  Tooltip,
  OverlayTrigger,
  Card,
  Col,
  Row,
} from "react-bootstrap";
import { toast } from "react-toastify";
import * as _ from "lodash";
import classNames from "classnames";
import { isMobile } from "react-device-detect";

import GameClient from "./GameClient";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import MapComponent, { MAP_HEIGHT } from "./MapComponent";
import MapControls, {
  OrderOnMapProperties,
  UnitOnMapProperties,
} from "./MapControls";
import GameStateColumn from "./GameStateColumn";
import HouseInfoColumn from "./HouseInfoColumn";
import GameTabsComponent from "./GameTabsComponent";

import House from "../common/ingame-game-state/game-data-structure/House";
import Region from "../common/ingame-game-state/game-data-structure/Region";
import Unit from "../common/ingame-game-state/game-data-structure/Unit";
import PartialRecursive from "../utils/PartialRecursive";

import cancelImage from "../../public/images/icons/cancel.svg";
import truceImage from "../../public/images/icons/truce.svg";
import stopwatchPlus15Image from "../../public/images/icons/stopwatch-plus-15.svg";
import stopwatchImage from "../../public/images/icons/stopwatch.svg";
import pauseImage from "../../public/images/icons/pause-button.svg";
import playImage from "../../public/images/icons/play-button.svg";
import stoneThroneImage from "../../public/images/icons/stone-throne.svg";
import diamondHiltImage from "../../public/images/icons/diamond-hilt.svg";
import diamondHiltUsedImage from "../../public/images/icons/diamond-hilt-used.svg";
import ravenImage from "../../public/images/icons/raven.svg";
import settingsKnobsImage from "../../public/images/icons/settings-knobs.svg";
import speakerImage from "../../public/images/icons/speaker.svg";
import speakerOffImage from "../../public/images/icons/speaker-off.svg";
import podiumWinnerImage from "../../public/images/icons/podium-winner.svg";
import contractImage from "../../public/images/icons/contract.svg";

import CancelledGameState from "../common/cancelled-game-state/CancelledGameState";
import DraftHouseCardsGameState from "../common/ingame-game-state/draft-game-state/draft-house-cards-game-state/DraftHouseCardsGameState";
import ClashOfKingsGameState from "../common/ingame-game-state/westeros-game-state/clash-of-kings-game-state/ClashOfKingsGameState";
import houseCardsBackImages from "./houseCardsBackImages";
import houseInfluenceImages from "./houseInfluenceImages";
import houseOrderImages from "./houseOrderImages";
import housePowerTokensImages from "./housePowerTokensImages";
import unitTypes from "../common/ingame-game-state/game-data-structure/unitTypes";
import unitImages from "./unitImages";
import { tidesOfBattleCards } from "../common/ingame-game-state/game-data-structure/static-data-structure/tidesOfBattleCards";
import { OverlayChildren } from "react-bootstrap/esm/Overlay";
import WildlingCardType from "../common/ingame-game-state/game-data-structure/wildling-card/WildlingCardType";
import WildlingCardComponent from "./game-state-panel/utils/WildlingCardComponent";
import { CombatStats } from "../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import CombatInfoComponent from "./CombatInfoComponent";
import HouseNumberResultsComponent from "./HouseNumberResultsComponent";
import houseIconImages from "./houseIconImages";
import { preemptiveRaid } from "../common/ingame-game-state/game-data-structure/wildling-card/wildlingCardTypes";
import { houseColorFilters } from "./houseColorFilters";
import LocalStorageService from "./utils/localStorageService";
import SimpleInfluenceIconComponent from "./game-state-panel/utils/SimpleInfluenceIconComponent";
import VolumeSliderComponent from "./utils/VolumeSliderComponent";
import { houseThemes } from "./utils/SfxManager";

export interface ColumnOrders {
  gameStateColumn: number;
  mapColumn: number;
  housesInfosColumn: number;
}

interface IngameComponentProps {
  gameClient: GameClient;
  gameState: IngameGameState;
}

export interface InfluenceTrackDetails {
  name: string;
  trackToShow: (House | null)[];
  realTrack: House[];
  stars: boolean;
}

@observer
export default class IngameComponent extends Component<IngameComponentProps> {
  mapControls: MapControls = new MapControls();

  @observable showMapScrollbarInfo = false;
  @observable showBrowserZoomInfo = false;
  @observable columnSwapAnimationClassName = "";
  @observable tracksPopoverVisible = false;
  @observable gameStateColumnWidth: number | null = null;

  gameStateColumnRef = React.createRef<HTMLDivElement>();
  resizeDebounceTimer: number | null = null;

  private ingame = this.props.gameState;
  private gameClient = this.props.gameClient;
  private user = this.props.gameClient.authenticatedUser;
  private authenticatedPlayer = this.props.gameClient.authenticatedPlayer;
  private game = this.ingame.game;
  private gameSettings = this.ingame.entireGame.gameSettings;

  modifyOrdersOnMapCallback: any;
  modifyUnitsOnMapCallback: any;

  calcInfluenceTrackDetails(): InfluenceTrackDetails[] {
    const influenceTracks: (House | null)[][] = this.game.influenceTracks.map(
      (track) => Array.from(track),
    );
    if (this.ingame.hasChildGameState(ClashOfKingsGameState)) {
      const cok = this.ingame.getChildGameState(
        ClashOfKingsGameState,
      ) as ClashOfKingsGameState;
      for (let i = cok.currentTrackI; i < influenceTracks.length; i++) {
        influenceTracks[i] = this.clientGetFixedInfluenceTrack(
          influenceTracks[i].map((h) =>
            (i == 0 && h == this.game.ironThroneHolder) ||
            h == this.game.targaryen
              ? h
              : null,
          ),
        );
      }
    } else if (this.ingame.hasChildGameState(DraftHouseCardsGameState)) {
      for (let i = 0; i < influenceTracks.length; i++) {
        while (influenceTracks[i].length < this.game.houses.size) {
          influenceTracks[i].push(null);
        }
        if (
          this.game.targaryen &&
          !influenceTracks[i].includes(this.game.targaryen)
        ) {
          influenceTracks[i][influenceTracks[i].length - 1] =
            this.game.targaryen;
        }
        influenceTracks[i] = this.clientGetFixedInfluenceTrack(
          influenceTracks[i],
        );
      }
    }
    return [
      {
        name: "Iron Throne",
        trackToShow: influenceTracks[0],
        realTrack: this.game.influenceTracks[0],
        stars: false,
      },
      {
        name: "Fiefdoms",
        trackToShow: influenceTracks[1],
        realTrack: this.game.influenceTracks[1],
        stars: false,
      },
      {
        name: "King's Court",
        trackToShow: influenceTracks[2],
        realTrack: this.game.influenceTracks[2],
        stars: true,
      },
    ];
  }

  constructor(props: IngameComponentProps) {
    super(props);
    // Check for Dance with Dragons house cards
    if (props.gameState.entireGame.gameSettings.adwdHouseCards) {
      // Replace Stark images with Bolton images for DwD
      houseCardsBackImages.set("stark", houseCardsBackImages.get("bolton"));
      houseInfluenceImages.set("stark", houseInfluenceImages.get("bolton"));
      houseOrderImages.set("stark", houseOrderImages.get("bolton"));
      housePowerTokensImages.set("stark", housePowerTokensImages.get("bolton"));
      unitImages.set("stark", unitImages.get("bolton"));
      houseIconImages.set("stark", houseIconImages.get("bolton"));
      houseColorFilters.set("stark", houseColorFilters.get("bolton"));
      houseThemes.set("stark", houseThemes.get("bolton"));
    }
  }

  clientGetFixedInfluenceTrack(track: (House | null)[]): (House | null)[] {
    if (!this.game.targaryen) {
      return track;
    }

    return _.concat(_.without(track, this.game.targaryen), this.game.targaryen);
  }

  render(): ReactNode {
    const tracks = this.calcInfluenceTrackDetails();
    if (this.gameClient.logChatFullScreen) {
      const isOwnTurn = this.gameClient.isOwnTurn();
      const border = isOwnTurn
        ? "warning"
        : this.ingame.childGameState instanceof CancelledGameState
          ? "danger"
          : undefined;
      return (
        <Col
          xs="12"
          lg="8"
          xl="6"
          style={{ maxHeight: "95vh", height: "95vh" }}
        >
          <GameTabsComponent
            gameClient={this.gameClient}
            ingame={this.ingame}
            mapControls={this.mapControls}
            border={border}
          />
          <button
            className="btn btn-secondary"
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              zIndex: 1000,
            }}
            onClick={() => {
              this.gameClient.logChatFullScreen = false;
            }}
          >
            <img src={contractImage} width={24} />
          </button>
        </Col>
      );
    }
    const columnOrder = this.user?.settings.gameStateColumnRight
      ? { housesInfosColumn: 1, mapColumn: 2, gameStateColumn: 3 }
      : { gameStateColumn: 1, mapColumn: 2, housesInfosColumn: 3 };

    return (
      <>
        <Row
          className="justify-content-center"
          style={{
            maxHeight: this.gameClient.isMapScrollbarSet ? "95vh" : "none",
          }}
        >
          <Col
            xs={{ order: columnOrder.gameStateColumn }}
            className={this.columnSwapAnimationClassName}
            ref={this.gameStateColumnRef as any}
            style={{
              maxHeight: this.gameClient.isMapScrollbarSet ? "100%" : "none",
              minWidth: this.gameSettings.playerCount >= 8 ? "485px" : "470px",
              maxWidth: this.ingame.hasChildGameState(DraftHouseCardsGameState)
                ? "1200px"
                : "800px",
              width: this.gameStateColumnWidth ?? undefined,
            }}
          >
            <GameStateColumn
              ingame={this.ingame}
              gameClient={this.gameClient}
              mapControls={this.mapControls}
              onColumnSwapClick={(e) => this.onColumnSwap(e)}
            />
          </Col>
          {!this.ingame.hasChildGameState(DraftHouseCardsGameState) ||
          this.gameClient.showMapWhileDrafting ? (
            <Col
              xs={{ span: "auto", order: columnOrder.mapColumn }}
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
                <MapComponent
                  gameClient={this.gameClient}
                  ingameGameState={this.ingame}
                  mapControls={this.mapControls}
                />
              </div>
            </Col>
          ) : null}
          <Col
            xs={{
              span: "auto",
              order: columnOrder.housesInfosColumn,
            }}
            style={{
              maxHeight: this.gameClient.isMapScrollbarSet ? "100%" : "none",
              maxWidth: "600px",
            }}
            className={classNames(this.columnSwapAnimationClassName, {
              "d-none d-xl-block":
                !isMobile && this.gameSettings.playerCount < 8,
              "d-none d-xxl-block":
                !isMobile && this.gameSettings.playerCount >= 8,
            })}
          >
            <HouseInfoColumn
              ingame={this.ingame}
              gameClient={this.gameClient}
              mapControls={this.mapControls}
              gameControlsPopover={this.renderGameControlsPopover()}
              tracks={tracks}
              showGameControls={true}
              onColumnSwapClick={(e) => this.onColumnSwap(e)}
            />
          </Col>
        </Row>
        {this.renderScrollbarModal()}
        {this.renderTracksPopoverButton(tracks)}
        {this.renderGameControlsButton()}
      </>
    );
  }

  onColumnSwap(e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    if (this.user && this.columnSwapAnimationClassName === "") {
      e.currentTarget.blur();
      this.columnSwapAnimationClassName = "animate__animated animate__fadeIn";
      this.user.settings.gameStateColumnRight =
        !this.user.settings.gameStateColumnRight;
      this.tracksPopoverVisible = false;
      window.setTimeout(() => {
        this.columnSwapAnimationClassName = "";
      }, 2050);
    }
  }

  renderGameControlsButton(): ReactNode {
    if (isMobile) {
      return null;
    }

    return (
      <>
        <OverlayTrigger
          overlay={this.renderGameControlsPopover()}
          placement="auto"
          trigger="click"
          rootClose
        >
          <div
            className="clickable btn btn-sm btn-secondary"
            style={{
              position: "fixed",
              right: this.user?.settings.gameStateColumnRight ? "auto" : "4px",
              left: this.user?.settings.gameStateColumnRight ? "4px" : "auto",
              top: "45px",
              padding: "4px",
              borderStyle: "none",
            }}
          >
            <img src={settingsKnobsImage} width={24} />
          </div>
        </OverlayTrigger>
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={() => (this.gameClient.muted = !this.gameClient.muted)}
          style={{
            position: "fixed",
            right: this.user?.settings.gameStateColumnRight ? "auto" : "4px",
            left: this.user?.settings.gameStateColumnRight ? "4px" : "auto",
            top: "85px",
            paddingBottom: "4px",
            paddingTop: "4px",
            paddingLeft: "2px",
            paddingRight: "4px",
          }}
        >
          <OverlayTrigger
            placement="auto"
            overlay={
              <Tooltip id="mute-tooltip">
                {this.gameClient.muted ? "Unmute" : "Mute"}
              </Tooltip>
            }
          >
            <img
              src={this.gameClient.muted ? speakerOffImage : speakerImage}
              width={24}
            />
          </OverlayTrigger>
        </button>
      </>
    );
  }

  renderTracksPopoverButton(tracks: InfluenceTrackDetails[]): ReactNode {
    if (isMobile) {
      return null;
    }

    let ironThroneHolder: House | null = null;
    let vsbHolder: House | null = null;
    let ravenHolder: House | null = null;

    try {
      ironThroneHolder =
        _.first(
          tracks[0].trackToShow.filter((h) => h == this.game.ironThroneHolder),
        ) ?? null;
    } catch {
      // Swallow possible exceptions thrown by getTokenHolder, e.g. during drafting. ironThroneHolder simply stays null then.
    }

    try {
      vsbHolder =
        _.first(
          tracks[1].trackToShow.filter(
            (h) => h == this.game.valyrianSteelBladeHolder,
          ),
        ) ?? null;
    } catch {
      // Swallow possible exceptions thrown by getTokenHolder, e.g. during drafting. vsbHolder simply stays null then.
    }

    try {
      ravenHolder =
        _.first(
          tracks[2].trackToShow.filter((h) => h == this.game.ravenHolder),
        ) ?? null;
    } catch {
      // Swallow possible exceptions thrown by getTokenHolder, e.g. during drafting. ravenHolder simply stays null then.
    }

    const potentialWinner = this.ingame.game.getPotentialWinner();
    const victoryPoints = this.ingame.game.getVictoryPoints(potentialWinner);

    return (
      <OverlayTrigger
        overlay={
          <Popover id="tracks-popover" className="scrollable-popover">
            <Col>
              <button
                type="button"
                className="close"
                onClick={() => (this.tracksPopoverVisible = false)}
                style={{ position: "sticky", top: 0 }}
              >
                <span>&times;</span>
              </button>
              <HouseInfoColumn
                ingame={this.ingame}
                gameClient={this.gameClient}
                mapControls={this.mapControls}
                gameControlsPopover={this.renderGameControlsPopover()}
                tracks={tracks}
                onColumnSwapClick={(e) => this.onColumnSwap(e)}
              />
            </Col>
          </Popover>
        }
        placement="auto"
        show={this.tracksPopoverVisible}
      >
        <div
          className={classNames("clickable btn btn-sm btn-secondary p-1", {
            "d-xl-none d-xxl-none":
              !isMobile && this.gameSettings.playerCount < 8,
            "d-xxl-none": !isMobile && this.gameSettings.playerCount >= 8,
          })}
          onClick={() => {
            this.tracksPopoverVisible = !this.tracksPopoverVisible;
          }}
          style={{
            position: "fixed",
            right: this.user?.settings.gameStateColumnRight ? "auto" : "4px",
            left: this.user?.settings.gameStateColumnRight ? "4px" : "auto",
            top: "6px",
            padding: "4px",
            borderStyle: "none",
          }}
        >
          <div className="d-flex flex-row flex-nowrap">
            <img src={stoneThroneImage} width={24} style={{ opacity: 0.8 }} />
            <SimpleInfluenceIconComponent
              house={ironThroneHolder}
              xsmall
              style={{ marginLeft: "-16px", zIndex: -1 }}
            />
            <img
              src={
                this.game.valyrianSteelBladeUsed
                  ? diamondHiltUsedImage
                  : diamondHiltImage
              }
              width={24}
            />
            <SimpleInfluenceIconComponent
              house={vsbHolder}
              xsmall
              style={{ marginLeft: "-16px", zIndex: -1 }}
            />
            <img src={ravenImage} width={24} style={{ opacity: 0.8 }} />
            <SimpleInfluenceIconComponent
              house={ravenHolder}
              xsmall
              style={{ marginLeft: "-16px", zIndex: -1 }}
            />
            <img src={podiumWinnerImage} width={24} style={{ opacity: 0.8 }} />
            <SimpleInfluenceIconComponent
              house={potentialWinner}
              xsmall
              style={{ marginLeft: "-16px", zIndex: -1 }}
            />
            <div style={{ marginLeft: "-3px" }}>{victoryPoints}</div>
          </div>
        </div>
      </OverlayTrigger>
    );
  }

  renderScrollbarModal(): ReactNode {
    return (
      <Modal
        show={this.showMapScrollbarInfo || this.showBrowserZoomInfo}
        onHide={() => this.closeModal()}
        animation={false}
        backdrop="static"
        keyboard={false}
        centered
      >
        <Modal.Header
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
          }}
        >
          <h3 className="text-center" style={{ color: "red" }}>
            Useful hint!
            <br />
            <small>Please read...</small>
          </h3>
        </Modal.Header>
        <Modal.Body>
          {this.showMapScrollbarInfo ? (
            <div className="text-center">
              The game is optimized for HD resolutions.
              <br />
              You are using a lower display resolution and should try different
              combinations of your browser&apos;s zoom level and the{" "}
              <b>Map scrollbar</b> setting to ensure a pleasent gaming
              experience. The setting can be found in the tab with the gear
              icon.
              <br />
              <br />
              <small>
                <i>
                  In your profile settings you can change the default behavior
                  for this setting
                  <br />
                  for all <b>future</b> games.
                </i>
              </small>
            </div>
          ) : (
            <div className="text-center">
              Unfortunately, your display resolution is too low to show all
              elements in a row. Use the function of your browser to zoom out
              and avoid scrolling all the time.
            </div>
          )}
        </Modal.Body>
        <Modal.Footer
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <FormCheck
            id="dont-show-again-setting"
            type="switch"
            label={
              <label htmlFor="dont-show-again-setting">
                Don&apos;t show again
              </label>
            }
            onChange={(evt) => {
              LocalStorageService.setWithExpiry<boolean>(
                "dontShowScrollbarHintsAgain",
                evt.target.checked,
                30 * 24 * 60 * 60,
              );
            }}
          />
          <Button
            type="submit"
            variant="primary"
            onClick={() => this.closeModal()}
          >
            Ok
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  closeModal(): void {
    this.showMapScrollbarInfo = false;
    this.showBrowserZoomInfo = false;
  }

  private renderGameControlsPopover(): OverlayChildren {
    const {
      result: canLaunchCancelGameVote,
      reason: canLaunchCancelGameVoteReason,
    } = this.ingame.canLaunchCancelGameVote(this.authenticatedPlayer);
    const { result: canLaunchEndGameVote, reason: canLaunchEndGameVoteReason } =
      this.ingame.canLaunchEndGameVote(this.authenticatedPlayer);
    const {
      result: canLaunchPauseGameVote,
      reason: canLaunchPauseGameVoteReason,
    } = this.ingame.canLaunchPauseGameVote(this.authenticatedPlayer);
    const {
      result: canLaunchResumeGameVote,
      reason: canLaunchResumeGameVoteReason,
    } = this.ingame.canLaunchResumeGameVote(this.authenticatedPlayer);
    const {
      result: canLaunchExtendPlayerClocksVote,
      reason: canLaunchExtendPlayerClocksVoteReason,
    } = this.ingame.canLaunchExtendPlayerClocksVote(this.authenticatedPlayer);

    return (
      <Popover
        id="game-controls-popover"
        style={{ maxWidth: "100%", borderColor: "white" }}
      >
        <Col className="m-2 p-2">
          <VolumeSliderComponent
            volume={this.gameClient.notificationsVolume * 100}
            name="Notifications"
            onVolumeChange={(val) =>
              this.gameClient.sfxManager.notificationVolumeChanged(val / 100)
            }
          />
          <VolumeSliderComponent
            volume={this.gameClient.musicVolume * 100}
            name="Music"
            onVolumeChange={(val) =>
              this.gameClient.sfxManager.musicVolumeChanged(val / 100)
            }
          />
          <VolumeSliderComponent
            volume={this.gameClient.sfxVolume * 100}
            name="Sfx"
            onVolumeChange={(val) =>
              this.gameClient.sfxManager.sfxVolumeChanged(val / 100)
            }
          />
          {this.authenticatedPlayer && (
            <Row className="justify-content-center mt-3">
              <Col xs="auto">
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm"
                  onClick={() => this.ingame.launchCancelGameVote()}
                  disabled={!canLaunchCancelGameVote}
                >
                  <OverlayTrigger
                    placement="auto"
                    overlay={
                      <Tooltip id="cancel-game-vote-tooltip">
                        {canLaunchCancelGameVote
                          ? "Launch a vote to cancel the game"
                          : canLaunchCancelGameVoteReason ==
                              "only-players-can-vote"
                            ? "Only participating players can vote"
                            : canLaunchCancelGameVoteReason ==
                                "already-existing"
                              ? "A vote to cancel the game is already ongoing"
                              : canLaunchCancelGameVoteReason ==
                                  "already-cancelled"
                                ? "Game has already been cancelled"
                                : canLaunchCancelGameVoteReason ==
                                    "already-ended"
                                  ? "Game has already ended"
                                  : canLaunchCancelGameVoteReason ==
                                      "forbidden-in-tournament-mode"
                                    ? "Canceling games is not allowed in tournaments"
                                    : "Vote not possible"}
                      </Tooltip>
                    }
                  >
                    <img src={cancelImage} width={32} />
                  </OverlayTrigger>
                </button>
              </Col>
              <Col xs="auto">
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm"
                  onClick={() => this.ingame.launchEndGameVote()}
                  disabled={!canLaunchEndGameVote}
                >
                  <OverlayTrigger
                    placement="auto"
                    overlay={
                      <Tooltip id="end-game-vote-tooltip">
                        {canLaunchEndGameVote
                          ? "Launch a vote to end the game after the current round"
                          : canLaunchEndGameVoteReason == "game-paused"
                            ? "The game must be resumed first"
                            : canLaunchEndGameVoteReason ==
                                "only-players-can-vote"
                              ? "Only participating players can vote"
                              : canLaunchEndGameVoteReason ==
                                  "already-last-turn"
                                ? "It is already the last round"
                                : canLaunchEndGameVoteReason ==
                                    "already-existing"
                                  ? "A vote to end the game is already ongoing"
                                  : canLaunchEndGameVoteReason ==
                                      "already-cancelled"
                                    ? "Game has already been cancelled"
                                    : canLaunchEndGameVoteReason ==
                                        "already-ended"
                                      ? "Game has already ended"
                                      : canLaunchEndGameVoteReason ==
                                          "forbidden-in-tournament-mode"
                                        ? "Early end is not allowed in tournaments"
                                        : "Vote not possible"}
                      </Tooltip>
                    }
                  >
                    <img src={truceImage} width={32} />
                  </OverlayTrigger>
                </button>
              </Col>
              {this.gameSettings.onlyLive && !this.ingame.paused && (
                <Col xs="auto">
                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm"
                    onClick={() => this.ingame.launchPauseGameVote()}
                    disabled={!canLaunchPauseGameVote}
                  >
                    <OverlayTrigger
                      placement="auto"
                      overlay={
                        <Tooltip id="pause-game-vote-tooltip">
                          {canLaunchPauseGameVote
                            ? "Launch a vote to pause the game"
                            : canLaunchPauseGameVoteReason ==
                                "only-players-can-vote"
                              ? "Only participating players can vote"
                              : canLaunchPauseGameVoteReason ==
                                  "already-existing"
                                ? "A vote to pause the game is already ongoing"
                                : canLaunchPauseGameVoteReason ==
                                    "already-cancelled"
                                  ? "Game has already been cancelled"
                                  : canLaunchPauseGameVoteReason ==
                                      "already-ended"
                                    ? "Game has already ended"
                                    : "Vote not possible"}
                        </Tooltip>
                      }
                    >
                      <img src={pauseImage} width={32} />
                    </OverlayTrigger>
                  </button>
                </Col>
              )}
              {this.gameSettings.onlyLive && this.ingame.paused && (
                <Col xs="auto">
                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm"
                    onClick={() => this.ingame.launchResumeGameVote()}
                    disabled={!canLaunchResumeGameVote}
                  >
                    <OverlayTrigger
                      placement="auto"
                      overlay={
                        <Tooltip id="resume-game-vote-tooltip">
                          {canLaunchResumeGameVote
                            ? "Launch a vote to resume the game"
                            : canLaunchResumeGameVoteReason ==
                                "only-players-can-vote"
                              ? "Only participating players can vote"
                              : canLaunchResumeGameVoteReason ==
                                  "already-existing"
                                ? "A vote to resume the game is already ongoing"
                                : canLaunchResumeGameVoteReason ==
                                    "already-cancelled"
                                  ? "Game has already been cancelled"
                                  : canLaunchResumeGameVoteReason ==
                                      "already-ended"
                                    ? "Game has already ended"
                                    : "Vote not possible"}
                        </Tooltip>
                      }
                    >
                      <img src={playImage} width={32} />
                    </OverlayTrigger>
                  </button>
                </Col>
              )}
              {this.gameSettings.onlyLive && (
                <Col xs="auto">
                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm"
                    onClick={() => this.ingame.launchExtendPlayerClocksVote()}
                    disabled={!canLaunchExtendPlayerClocksVote}
                  >
                    <OverlayTrigger
                      placement="auto"
                      overlay={
                        <Tooltip id="extend-clocks-vote-tooltip">
                          {canLaunchExtendPlayerClocksVote
                            ? "Launch a vote to extend all player clocks by 15 minutes"
                            : canLaunchExtendPlayerClocksVoteReason ==
                                "game-paused"
                              ? "The game must be resumed first"
                              : canLaunchExtendPlayerClocksVoteReason ==
                                  "only-players-can-vote"
                                ? "Only participating players can vote"
                                : canLaunchExtendPlayerClocksVoteReason ==
                                    "already-existing"
                                  ? "A vote to extend all clocks is already ongoing"
                                  : canLaunchExtendPlayerClocksVoteReason ==
                                      "already-extended"
                                    ? "Player clocks have already been extended"
                                    : canLaunchExtendPlayerClocksVoteReason ==
                                        "max-vote-count-reached"
                                      ? "The maximum amount of votes was reached"
                                      : canLaunchExtendPlayerClocksVoteReason ==
                                          "already-cancelled"
                                        ? "Game has already been cancelled"
                                        : canLaunchExtendPlayerClocksVoteReason ==
                                            "already-ended"
                                          ? "Game has already ended"
                                          : canLaunchExtendPlayerClocksVoteReason ==
                                              "forbidden-in-tournament-mode"
                                            ? "Extending player clocks is not allowed in tournaments"
                                            : canLaunchExtendPlayerClocksVoteReason ==
                                                "forbidden-by-host"
                                              ? "Extension of player clocks was deactivated by the game host"
                                              : "Vote not possible"}
                        </Tooltip>
                      }
                    >
                      <img src={stopwatchPlus15Image} width={32} />
                    </OverlayTrigger>
                  </button>
                </Col>
              )}
            </Row>
          )}
        </Col>
      </Popover>
    );
  }

  getCombatFastTrackedComponent(stats: CombatStats[]): React.ReactNode {
    const winners = stats.filter((cs) => cs.isWinner);
    const winner =
      winners.length > 0 ? this.game.houses.get(winners[0].house) : null;

    const houseCombatDatas = stats.map((stat) => {
      const house = this.game.houses.get(stat.house);
      const houseCard = stat.houseCard
        ? this.game.getHouseCardById(stat.houseCard)
        : null;
      const tidesOfBattleCard =
        stat.tidesOfBattleCard === undefined
          ? undefined
          : stat.tidesOfBattleCard != null
            ? tidesOfBattleCards.get(stat.tidesOfBattleCard)
            : null;

      return {
        ...stat,
        house,
        region: this.game.world.regions.get(stat.region),
        houseCard: houseCard,
        armyUnits: stat.armyUnits.map((ut) => unitTypes.get(ut)),
        woundedUnits: stat.woundedUnits.map((ut) => unitTypes.get(ut)),
        tidesOfBattleCard: tidesOfBattleCard,
      };
    });

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <h5>
            Battle results for <b>{houseCombatDatas[1].region.name}</b>
          </h5>
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <CombatInfoComponent housesCombatData={houseCombatDatas} />
        </div>
        {winner && (
          <p className="text-center mt-2">
            Winner: <b style={{ color: winner.color }}>{winner.name}</b>
          </p>
        )}
      </div>
    );
  }

  getWildlingsAttackFastTrackedComponent(
    wildlingCard: WildlingCardType,
    biddings: [number, House[]][] | null,
    highestBidder: House | null,
    lowestBidder: House | null,
  ): React.ReactNode {
    const results = biddings
      ? _.flatMap(
          biddings.map(([bid, houses]) =>
            houses.map((h) => [h, bid] as [House, number]),
          ),
        )
      : null;

    return (
      <div>
        <h5 className="text-center mb-2">
          {highestBidder ? "Night's watch victory" : "Wildling victory"}
        </h5>
        <div className="d-flex justify-content-center">
          <WildlingCardComponent cardType={wildlingCard} />
        </div>
        {results && (
          <div className="d-flex justify-content-center mt-2">
            <HouseNumberResultsComponent
              results={results}
              keyPrefix="wildling-biddings"
            />
          </div>
        )}
        {highestBidder && (
          <p className="text-center mt-2">
            Highest Bidder:{" "}
            <b style={{ color: highestBidder.color }}>{highestBidder.name}</b>
          </p>
        )}
        {lowestBidder && (
          <p className="text-center mt-2">
            Lowest Bidder:{" "}
            <b style={{ color: lowestBidder.color }}>{lowestBidder.name}</b>
          </p>
        )}
      </div>
    );
  }

  componentDidMount(): void {
    this.mapControls.modifyOrdersOnMap.push(
      (this.modifyOrdersOnMapCallback = () => this.modifyOrdersOnMap()),
    );
    this.mapControls.modifyUnitsOnMap.push(
      (this.modifyUnitsOnMapCallback = () => this.modifyUnitsOnMap()),
    );

    // Measure and lock the column width after initial render
    setTimeout(() => this.measureAndLockColumnWidth(), 100);

    // Add debounced resize listener
    window.addEventListener("resize", this.handleResize);

    const dontShowAgainFromStorage = LocalStorageService.getWithExpiry<boolean>(
      "dontShowScrollbarHintsAgain",
    );

    const dontShowAgain = isMobile || (dontShowAgainFromStorage ?? false);
    if (
      screen.width < 1920 &&
      screen.height < 1080 &&
      this.gameClient.isMapScrollbarSet &&
      !dontShowAgain
    ) {
      this.showMapScrollbarInfo = true;
    } else if (this.hasVerticalScrollbar() && !dontShowAgain) {
      this.showBrowserZoomInfo = true;
    }

    this.ingame.entireGame.onCombatFastTracked = (stats) => {
      if (stats.length == 0) return;
      toast(this.getCombatFastTrackedComponent(stats));
    };

    this.ingame.entireGame.onWildingsAttackFastTracked = (
      wildlingCard,
      biddings,
      highestBidder,
      lowestBidder,
    ) => {
      toast(
        this.getWildlingsAttackFastTrackedComponent(
          wildlingCard,
          biddings,
          highestBidder,
          lowestBidder,
        ),
      );
    };

    this.ingame.onPreemptiveRaidNewAttack = (biddings, highestBidder) => {
      toast(
        this.getWildlingsAttackFastTrackedComponent(
          preemptiveRaid,
          biddings,
          highestBidder,
          null,
        ),
      );
    };

    this.ingame.onVoteStarted = () =>
      this.gameClient.sfxManager.playVoteNotificationSound();

    this.ingame.onLogReceived = (log) => {
      this.gameClient.sfxManager.playSoundForLogEvent(log);
    };

    this.ingame.onGamePaused = () => {
      toast(
        <div>
          <Card>
            <Card.Body className="d-flex align-items-center">
              <img src={stopwatchImage} width={64} />
              <h4 className="d-inline ml-3" style={{ color: "white" }}>
                Game has been paused!
              </h4>
            </Card.Body>
          </Card>
        </div>,
        {
          autoClose: 3000,
          toastId: "game-paused-toast",
          theme: "light",
        },
      );
    };

    this.ingame.onGameResumed = () => {
      toast(
        <div>
          <Card>
            <Card.Body className="d-flex align-items-center">
              <img src={stopwatchImage} width={64} />
              <h4 className="d-inline ml-3" style={{ color: "white" }}>
                Game has resumed!
              </h4>
            </Card.Body>
          </Card>
        </div>,
        {
          autoClose: 3000,
          toastId: "game-paused-toast",
          theme: "light",
        },
      );
    };
  }

  hasVerticalScrollbar(): boolean {
    const gameContainer = document.getElementById(
      "game-container",
    ) as HTMLElement;
    return gameContainer.scrollHeight > gameContainer.clientHeight;
  }

  componentWillUnmount(): void {
    this.ingame.entireGame.onNewPrivateChatRoomCreated = null;
    _.pull(this.mapControls.modifyOrdersOnMap, this.modifyOrdersOnMapCallback);
    _.pull(this.mapControls.modifyUnitsOnMap, this.modifyUnitsOnMapCallback);

    this.ingame.entireGame.onWildingsAttackFastTracked = null;
    this.ingame.entireGame.onCombatFastTracked = null;
    this.ingame.onPreemptiveRaidNewAttack = null;
    this.ingame.onVoteStarted = null;

    // Clean up resize listener and timer
    window.removeEventListener("resize", this.handleResize);
    if (this.resizeDebounceTimer !== null) {
      window.clearTimeout(this.resizeDebounceTimer);
    }
  }

  measureAndLockColumnWidth = (): void => {
    if (this.gameStateColumnRef.current) {
      const width = this.gameStateColumnRef.current.offsetWidth;
      this.gameStateColumnWidth = width;
    }
  };

  handleResize = (): void => {
    // Clear existing timer
    if (this.resizeDebounceTimer !== null) {
      window.clearTimeout(this.resizeDebounceTimer);
    }

    // Reset width to allow natural sizing, then remeasure after debounce
    this.gameStateColumnWidth = null;

    this.resizeDebounceTimer = window.setTimeout(() => {
      this.measureAndLockColumnWidth();
      this.resizeDebounceTimer = null;
    }, 300);
  };

  modifyOrdersOnMap(): [Region, PartialRecursive<OrderOnMapProperties>][] {
    return this.ingame.ordersToBeAnimated.entries;
  }

  modifyUnitsOnMap(): [Unit, PartialRecursive<UnitOnMapProperties>][] {
    return this.ingame.unitsToBeAnimated.entries;
  }
}
