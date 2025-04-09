import React, { Component, ReactNode } from "react";
import { observer } from "mobx-react";
import { observable } from "mobx";

import {
  Col,
  Row,
  Card,
  ListGroup,
  ListGroupItem,
  OverlayTrigger,
  Tooltip,
  Spinner,
} from "react-bootstrap";

import { Channel } from "../chat-client/ChatClient";
import { MAX_WILDLING_STRENGTH } from "../../common/ingame-game-state/game-data-structure/Game";

import classNames from "classnames";
import * as _ from "lodash";

import IngameGameState from "../../common/ingame-game-state/IngameGameState";
import User from "../../server/User";
import Player from "../../common/ingame-game-state/Player";
import GameClient from "../GameClient";
import MapControls from "../MapControls";
import GameTabsComponent from "./GameTabsComponent";

import WesterosGameState from "../../common/ingame-game-state/westeros-game-state/WesterosGameState";
import PlanningGameState from "../../common/ingame-game-state/planning-game-state/PlanningGameState";
import ActionGameState from "../../common/ingame-game-state/action-game-state/ActionGameState";
import DraftGameState from "../../common/ingame-game-state/draft-game-state/DraftGameState";
import GameEndedGameState from "../../common/ingame-game-state/game-ended-game-state/GameEndedGameState";
import CancelledGameState from "../../common/cancelled-game-state/CancelledGameState";
import PayDebtsGameState from "../../common/ingame-game-state/pay-debts-game-state/PayDebtsGameState";
import ChooseInitialObjectivesGameState from "../../common/ingame-game-state/choose-initial-objectives-game-state/ChooseInitialObjectivesGameState";

import WesterosGameStateComponent from "./WesterosGameStateComponent";
import PlanningComponent from "./PlanningComponent";
import ActionComponent from "./ActionComponent";
import DraftComponent from "./DraftComponent";
import GameEndedComponent from "./GameEndedComponent";
import IngameCancelledComponent from "./IngameCancelledComponent";
import PayDebtsComponent from "./PayDebtsComponent";
import ChooseInitialObjectivesComponent from "./ChooseInitialObjectivesComponent";

import hourglassImage from "../../../public/images/icons/hourglass.svg";
import mammothImage from "../../../public/images/icons/mammoth.svg";
import ConditionalWrap from "../utils/ConditionalWrap";
import renderChildGameState from "../utils/renderChildGameState";
import ColumnSwapButton from "./utils/ColumnSwapButton";

interface GameStateColumnProps {
  ingame: IngameGameState;
  gameClient: GameClient;
  mapControls: MapControls;
  authenticatedPlayer: Player | null;
  publicChatRoom: Channel;
  user: User | null;
  colSwapAnimationClassChanged: (classname: string) => void;
  tracksPopoverVisibleChanged: (visible: boolean) => void;
}

@observer
export default class GameStateColumn extends Component<GameStateColumnProps> {
  @observable columnSwapAnimationClassName = "";

  private ingame = this.props.ingame;
  private gameClient = this.props.gameClient;
  private mapControls = this.props.mapControls;

  render(): ReactNode {
    const { authenticatedPlayer, publicChatRoom, user } = this.props;

    const phases = [
      {
        name: "Westeros",
        gameState: WesterosGameState,
        component: WesterosGameStateComponent,
      },
      {
        name: "Planning",
        gameState: PlanningGameState,
        component: PlanningComponent,
      },
      {
        name: "Action",
        gameState: ActionGameState,
        component: ActionComponent,
      },
    ];

    const gameRunning = !this.ingame.isEndedOrCancelled;
    const roundWarning =
      gameRunning && this.ingame.game.maxTurns - this.ingame.game.turn == 1;
    const roundCritical =
      gameRunning && this.ingame.game.turn == this.ingame.game.maxTurns;

    const wildlingsWarning =
      gameRunning &&
      this.ingame.game.wildlingStrength == MAX_WILDLING_STRENGTH - 4;
    const wildlingsCritical =
      gameRunning &&
      (this.ingame.game.wildlingStrength == MAX_WILDLING_STRENGTH ||
        this.ingame.game.wildlingStrength == MAX_WILDLING_STRENGTH - 2);

    const isOwnTurn = this.gameClient.isOwnTurn();
    const border = isOwnTurn
      ? "warning"
      : this.ingame.childGameState instanceof CancelledGameState
        ? "danger"
        : undefined;

    const isPhaseActive = (phase: any): boolean =>
      this.ingame.childGameState instanceof phase.gameState;

    return (
      <div className="flex-ratio-container">
        <Card
          id="game-state-panel"
          className="flex-sized-to-content mb-2"
          border={border}
          style={{
            maxHeight: "65%",
            paddingRight: "2px",
            borderWidth: "3px",
            overflowY: "scroll",
          }}
        >
          <Row className="no-space-around">
            <Col>
              <ListGroup variant="flush">
                {phases.some((phase) => isPhaseActive(phase)) && (
                  <ListGroupItem>
                    <Row className="justify-content-between align-items-center">
                      {phases.map((phase) => (
                        <Col
                          xs="auto"
                          key={`${phase.name}_phase`}
                          className="px-1"
                        >
                          <div
                            className={classNames({
                              "p-1": true,
                              "weak-box-outline": isPhaseActive(phase),
                              "text-muted": !isPhaseActive(phase),
                            })}
                          >
                            <ConditionalWrap
                              condition={isPhaseActive(phase)}
                              wrap={(child) => <b>{child}</b>}
                            >
                              <>{phase.name} phase</>
                            </ConditionalWrap>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </ListGroupItem>
                )}
                <ListGroupItem className="text-large">
                  {renderChildGameState(
                    {
                      mapControls: this.mapControls,
                      gameClient: this.gameClient,
                      gameState: this.ingame,
                    },
                    _.concat(
                      phases.map(
                        (phase) =>
                          [phase.gameState, phase.component] as [
                            any,
                            typeof Component,
                          ]
                      ),
                      [[DraftGameState, DraftComponent]],
                      [[GameEndedGameState, GameEndedComponent]],
                      [[CancelledGameState, IngameCancelledComponent]],
                      [[PayDebtsGameState, PayDebtsComponent]],
                      [
                        [
                          ChooseInitialObjectivesGameState,
                          ChooseInitialObjectivesComponent,
                        ],
                      ]
                    )
                  )}
                </ListGroupItem>
              </ListGroup>
            </Col>
            <Col xs="auto" className="mx-1 px-0">
              <Col
                style={{ width: "28px", fontSize: "1.375rem" }}
                className="px-0 text-center"
              >
                <Row className="mb-3 mx-0">
                  <OverlayTrigger
                    overlay={
                      <Tooltip id="round-tooltip">
                        <h5>
                          Round {this.ingame.game.turn} /{" "}
                          {this.ingame.game.maxTurns}
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
                        width={28}
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
                        {this.ingame.game.turn}
                      </div>
                    </div>
                  </OverlayTrigger>
                </Row>
                <Row className="mr-0">
                  <div>
                    <OverlayTrigger
                      overlay={
                        <Tooltip id="wildling-tooltip">
                          Wildling Strength: {this.ingame.game.wildlingStrength}
                        </Tooltip>
                      }
                      placement="auto"
                    >
                      <div className="clickable btn btn-sm btn-secondary p-1">
                        <img
                          src={mammothImage}
                          width={28}
                          className={classNames(
                            { "dye-warning": wildlingsWarning },
                            { "dye-critical": wildlingsCritical }
                          )}
                        />
                      </div>
                    </OverlayTrigger>
                  </div>
                </Row>
              </Col>
            </Col>
          </Row>
          <ColumnSwapButton
            user={this.props.user}
            columnSwapAnimationClassName={this.columnSwapAnimationClassName}
            colSwapAnimationClassChanged={
              this.props.colSwapAnimationClassChanged
            }
            tracksPopoverVisibleChanged={this.props.tracksPopoverVisibleChanged}
          />
          {isOwnTurn && (
            <Spinner
              animation="grow"
              variant="warning"
              size="sm"
              style={{ position: "absolute", bottom: "4px", left: "4px" }}
            />
          )}
        </Card>
        <GameTabsComponent
          authenticatedPlayer={authenticatedPlayer}
          gameClient={this.gameClient}
          ingame={this.ingame}
          mapControls={this.mapControls}
          publicChatRoom={publicChatRoom}
          user={user}
        />
      </div>
    );
  }
}
