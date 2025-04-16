import React, { Component, ReactNode } from "react";

import {
  Card,
  Col,
  Row,
  OverlayTrigger,
  Tooltip,
  Spinner,
  Tab,
  Nav,
  Dropdown,
} from "react-bootstrap";
import classNames from "classnames";

import GameClient from "./GameClient";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import { MAX_WILDLING_STRENGTH } from "../common/ingame-game-state/game-data-structure/Game";
import GameLogListComponent from "./GameLogListComponent";
import GameSettingsComponent from "./GameSettingsComponent";
import UserSettingsComponent from "./UserSettingsComponent";
import IronBankSnapshotTabComponent from "./IronBankSnapshotTabComponent";

import hourglassImage from "../../public/images/icons/hourglass.svg";
import mammothImage from "../../public/images/icons/mammoth.svg";
import spikedDragonHeadImage from "../../public/images/icons/spiked-dragon-head.svg";

import {
  faHistory,
  faUniversity,
  faGear,
  faForward,
  faBackward,
  faStepBackward,
  faStepForward,
  faMap,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ColumnSwapButton from "./game-state-panel/utils/ColumnSwapButton";
import { observer } from "mobx-react";
import { observable } from "mobx";

interface ReplayGameStateColumnProps {
  gameClient: GameClient;
  ingame: IngameGameState;
  currentOpenedTab: string;
  onTabChange: (tab: string) => void;
  onColumnSwapClick: () => void;
}

@observer
export default class ReplayGameStateColumn extends Component<ReplayGameStateColumnProps> {
  @observable roundDropDownItems: ReactNode[] = [];
  render(): ReactNode {
    const { gameClient, ingame } = this.props;

    const gameSnapshot = ingame.replayManager.selectedSnapshot?.gameSnapshot;

    if (!gameSnapshot) {
      return this.renderTabsInContainer();
    }

    const roundWarning =
      gameSnapshot && ingame.game.maxTurns - gameSnapshot.round === 1;
    const roundCritical =
      gameSnapshot && gameSnapshot.round === ingame.game.maxTurns;

    const wildlingsWarning =
      gameSnapshot &&
      gameSnapshot.wildlingStrength === MAX_WILDLING_STRENGTH - 4;
    const wildlingsCritical =
      gameSnapshot &&
      (gameSnapshot.wildlingStrength === MAX_WILDLING_STRENGTH ||
        gameSnapshot.wildlingStrength === MAX_WILDLING_STRENGTH - 2);

    const isOwnTurn = gameClient.isOwnTurn();
    const border = isOwnTurn ? "warning" : undefined;

    return (
      <div
        className={gameClient.isMapScrollbarSet ? "flex-ratio-container" : ""}
      >
        <Card
          id="game-state-panel"
          className={
            gameClient.isMapScrollbarSet ? "flex-sized-to-content mb-2" : "mb-2"
          }
          border={border}
          style={{
            maxHeight: gameClient.isMapScrollbarSet ? "70%" : "none",
            borderWidth: "3px",
          }}
        >
          <Row
            className="justify-content-center m-2 text-center"
            style={{ fontSize: "1.5rem" }}
          >
            <Col xs="auto" className="mx-2 px-2">
              <OverlayTrigger
                overlay={
                  <Tooltip id="round-tooltip">
                    <h5>
                      Round {gameSnapshot?.round} / {ingame.game.maxTurns}
                    </h5>
                  </Tooltip>
                }
                placement="auto"
              >
                <div>
                  <img
                    className={classNames(
                      { "dye-warning": roundWarning },
                      { "dye-critical": roundCritical }
                    )}
                    src={hourglassImage}
                    width={32}
                  />
                  <div
                    style={{
                      color: roundWarning
                        ? "#F39C12"
                        : roundCritical
                          ? "#FF0000"
                          : undefined,
                    }}
                  >
                    {gameSnapshot?.round}
                  </div>
                </div>
              </OverlayTrigger>
            </Col>
            <Col xs="auto" className="mx-2 px-2">
              <div>
                <div>
                  <img
                    src={mammothImage}
                    width={32}
                    className={classNames(
                      { "dye-warning": wildlingsWarning },
                      { "dye-critical": wildlingsCritical }
                    )}
                  />
                </div>
                <div
                  className={classNames({
                    "txt-warning": wildlingsWarning,
                    "txt-critical": wildlingsCritical,
                  })}
                >
                  {gameSnapshot?.wildlingStrength}
                </div>
              </div>
            </Col>
            {ingame.entireGame.gameSettings.playerCount >= 8 && (
              <Col xs="auto" className="mx-2 px-2">
                <div>
                  <img src={spikedDragonHeadImage} width={32} />
                  <div>{gameSnapshot?.dragonStrength}</div>
                </div>
              </Col>
            )}
          </Row>
          <ColumnSwapButton onClick={this.props.onColumnSwapClick} />
          {isOwnTurn && (
            <Spinner
              animation="grow"
              variant="warning"
              size="sm"
              style={{ position: "absolute", bottom: "4px", left: "4px" }}
            />
          )}
        </Card>
        {this.renderTabs()}
      </div>
    );
  }

  private renderTabsInContainer(): ReactNode {
    const { gameClient } = this.props;
    return (
      <div
        className={gameClient.isMapScrollbarSet ? "flex-ratio-container" : ""}
      >
        {this.renderTabs()}
      </div>
    );
  }

  private renderTabs(): ReactNode {
    const { gameClient, ingame, currentOpenedTab, onTabChange } = this.props;
    const gameSnapshot = ingame.replayManager.selectedSnapshot?.gameSnapshot;

    return (
      <Card
        style={{ height: gameClient.isMapScrollbarSet ? "auto" : "800px" }}
        className={classNames(
          { "flex-fill-remaining": gameClient.isMapScrollbarSet },
          "text-large"
        )}
      >
        <Tab.Container
          activeKey={currentOpenedTab}
          onSelect={(k) => k && onTabChange(k)}
        >
          <Card.Header>
            <Nav variant="tabs">
              <Nav.Item>
                <Nav.Link eventKey="game-logs">
                  <OverlayTrigger
                    overlay={<Tooltip id="logs-tooltip">Game Logs</Tooltip>}
                    placement="top"
                  >
                    <span>
                      <FontAwesomeIcon
                        style={{ color: "white" }}
                        icon={faHistory}
                      />
                    </span>
                  </OverlayTrigger>
                </Nav.Link>
              </Nav.Item>
              {gameSnapshot?.ironBank &&
                ingame.entireGame.gameSettings.playerCount < 8 && (
                  <Nav.Item>
                    <Nav.Link eventKey="iron-bank">
                      <OverlayTrigger
                        overlay={
                          <Tooltip id="iron-bank-tooltip">
                            The Iron Bank
                          </Tooltip>
                        }
                        placement="top"
                      >
                        <span>
                          <FontAwesomeIcon
                            style={{ color: "white" }}
                            icon={faUniversity}
                          />
                        </span>
                      </OverlayTrigger>
                    </Nav.Link>
                  </Nav.Item>
                )}
              <Nav.Item>
                <Nav.Link eventKey="settings">
                  <OverlayTrigger
                    overlay={<Tooltip id="settings-tooltip">Settings</Tooltip>}
                    placement="top"
                  >
                    <span>
                      <FontAwesomeIcon
                        style={{ color: "white" }}
                        icon={faGear}
                      />
                    </span>
                  </OverlayTrigger>
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <div className="dropdown-divider"></div>
              </Nav.Item>
              <button
                className="btn btn-secondary"
                onClick={(e) => {
                  e.currentTarget.blur();
                  ingame.replayManager.previousRoundLog();
                  this.scrollToSelectedLog();
                }}
              >
                <FontAwesomeIcon
                  style={{ color: "white" }}
                  icon={faStepBackward}
                />
              </button>
              <button
                className="btn btn-secondary"
                onClick={(e) => {
                  e.currentTarget.blur();
                  ingame.replayManager.previousLog();
                  this.scrollToSelectedLog();
                }}
              >
                <FontAwesomeIcon style={{ color: "white" }} icon={faBackward} />
              </button>
              <button
                className="btn btn-secondary"
                onClick={(e) => {
                  e.currentTarget.blur();
                  ingame.replayManager.nextLog();
                  this.scrollToSelectedLog();
                }}
              >
                <FontAwesomeIcon style={{ color: "white" }} icon={faForward} />
              </button>
              <button
                className="btn btn-secondary"
                onClick={(e) => {
                  e.currentTarget.blur();
                  ingame.replayManager.nextRoundLog();
                  this.scrollToSelectedLog();
                }}
              >
                <FontAwesomeIcon
                  style={{ color: "white" }}
                  icon={faStepForward}
                />
              </button>
              <Nav.Item>
                <div className="dropdown-divider"></div>
              </Nav.Item>
              <button
                className="btn btn-secondary"
                onClick={(e) => {
                  e.currentTarget.blur();
                  ingame.replayManager.toggleControlledAreasHighlighting();
                }}
              >
                <FontAwesomeIcon
                  className={
                    this.props.ingame.replayManager.highlightHouseAreas
                      ? "wildling-highlight"
                      : ""
                  }
                  icon={faMap}
                  style={{ color: "white" }}
                />
              </button>
              <Nav.Item>
                <div className="dropdown-divider"></div>
              </Nav.Item>
              <Dropdown className="ml-auto mt-1">
                <Dropdown.Toggle variant="secondary" size="sm">
                  Jump to
                </Dropdown.Toggle>
                <Dropdown.Menu>{this.roundDropDownItems}</Dropdown.Menu>
              </Dropdown>
            </Nav>
          </Card.Header>
          <Card.Body id="game-log-panel" className="h-100 px-1">
            <Tab.Content className="h-100">
              <Tab.Pane
                eventKey="game-logs"
                className="h-100 scrollable-content"
              >
                <div className="d-flex flex-column h-100">
                  <div className="flex-grow-1">
                    <GameLogListComponent
                      ingameGameState={ingame}
                      gameClient={gameClient}
                      currentlyViewed={true}
                    />
                  </div>
                </div>
              </Tab.Pane>
              {gameSnapshot?.ironBank && (
                <Tab.Pane eventKey="iron-bank">
                  <Row>
                    <IronBankSnapshotTabComponent
                      ingame={ingame}
                      ironBank={gameSnapshot.ironBank}
                    />
                  </Row>
                </Tab.Pane>
              )}
              <Tab.Pane eventKey="settings">
                <Row>
                  <GameSettingsComponent
                    gameClient={gameClient}
                    entireGame={ingame.entireGame}
                  />
                </Row>
                <Row className="justify-content-center">
                  <UserSettingsComponent
                    user={gameClient.authenticatedUser}
                    entireGame={ingame.entireGame}
                  />
                </Row>
              </Tab.Pane>
            </Tab.Content>
          </Card.Body>
        </Tab.Container>
      </Card>
    );
  }

  private getGameLogRoundsDropDownItems(): ReactNode[] {
    const gameRoundElements = document.querySelectorAll(
      '*[id^="gamelog-round-"]'
    );

    const result: ReactNode[] = [];

    gameRoundElements.forEach((gameRoundElem) => {
      const round = gameRoundElem.id.replace("gamelog-round-", "");

      result.push(
        <Dropdown.Item
          className="text-center"
          key={`dropdownitem-for-${gameRoundElem.id}`}
          onClick={() => {
            // When game log is the active tab, items get rendered before this logic here can work
            // Therefore we search the item during onClick again to make it work
            const elemToScroll = document.getElementById(gameRoundElem.id);
            elemToScroll?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }}
        >
          Round {round}
        </Dropdown.Item>
      );
    });

    return result;
  }

  private scrollToSelectedLog(): void {
    const selectedLog = document.getElementById(
      `game-log-content-${this.props.ingame.replayManager.selectedLogIndex}`
    );
    if (selectedLog) {
      window.setTimeout(() => {
        selectedLog.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 10); // Wait for the DOM to update
    }
  }

  componentDidMount(): void {
    this.roundDropDownItems = this.getGameLogRoundsDropDownItems();
    this.scrollToSelectedLog();
  }
}
