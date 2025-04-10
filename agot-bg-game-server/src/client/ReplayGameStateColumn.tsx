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
} from "react-bootstrap";
import classNames from "classnames";

import GameClient from "./GameClient";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import {
  GameSnapshot,
  MAX_WILDLING_STRENGTH,
} from "../common/ingame-game-state/game-data-structure/Game";
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
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ColumnSwapButton from "./game-state-panel/utils/ColumnSwapButton";

interface ReplayGameStateColumnProps {
  gameClient: GameClient;
  ingame: IngameGameState;
  gameSnapshot: GameSnapshot | undefined;
  currentOpenedTab: string;
  onTabChange: (tab: string) => void;
  onColumnSwapClick: () => void;
}

export default class ReplayGameStateColumn extends Component<ReplayGameStateColumnProps> {
  render(): ReactNode {
    const { gameClient, ingame, gameSnapshot, currentOpenedTab, onTabChange } =
      this.props;

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
                      overlay={
                        <Tooltip id="settings-tooltip">Settings</Tooltip>
                      }
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
              </Nav>
            </Card.Header>
            <Card.Body id="game-log-panel">
              <Tab.Content className="h-100">
                <Tab.Pane eventKey="game-logs" className="h-100">
                  <GameLogListComponent
                    ingameGameState={ingame}
                    gameClient={gameClient}
                    currentlyViewed={true}
                  />
                </Tab.Pane>
                {gameSnapshot?.ironBank && (
                  <Tab.Pane eventKey="iron-bank" className="h-100">
                    <IronBankSnapshotTabComponent
                      ingame={ingame}
                      ironBank={gameSnapshot.ironBank}
                    />
                  </Tab.Pane>
                )}
                <Tab.Pane eventKey="settings" className="h-100">
                  <GameSettingsComponent
                    gameClient={gameClient}
                    entireGame={ingame.entireGame}
                  />
                  <UserSettingsComponent
                    user={gameClient.authenticatedUser}
                    entireGame={ingame.entireGame}
                  />
                </Tab.Pane>
              </Tab.Content>
            </Card.Body>
          </Tab.Container>
        </Card>
      </div>
    );
  }
}
