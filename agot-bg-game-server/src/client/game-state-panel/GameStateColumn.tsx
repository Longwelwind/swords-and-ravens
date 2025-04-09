import React, { Component, ReactNode } from "react";
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
import classNames from "classnames";
import _ from "lodash";
import ConditionalWrap from "../utils/ConditionalWrap";
import renderChildGameState from "../utils/renderChildGameState";
import WesterosGameState from "../../common/ingame-game-state/westeros-game-state/WesterosGameState";
import WesterosGameStateComponent from "./WesterosGameStateComponent";
import PlanningGameState from "../../common/ingame-game-state/planning-game-state/PlanningGameState";
import PlanningComponent from "./PlanningComponent";
import ActionGameState from "../../common/ingame-game-state/action-game-state/ActionGameState";
import ActionComponent from "./ActionComponent";
import DraftGameState from "../../common/ingame-game-state/draft-game-state/DraftGameState";
import DraftComponent from "./DraftComponent";
import GameEndedGameState from "../../common/ingame-game-state/game-ended-game-state/GameEndedGameState";
import GameEndedComponent from "./GameEndedComponent";
import CancelledGameState from "../../common/cancelled-game-state/CancelledGameState";
import IngameCancelledComponent from "./IngameCancelledComponent";
import PayDebtsGameState from "../../common/ingame-game-state/pay-debts-game-state/PayDebtsGameState";
import PayDebtsComponent from "./PayDebtsComponent";
import ChooseInitialObjectivesGameState from "../../common/ingame-game-state/choose-initial-objectives-game-state/ChooseInitialObjectivesGameState";
import ChooseInitialObjectivesComponent from "./ChooseInitialObjectivesComponent";
import { MAX_WILDLING_STRENGTH } from "../../common/ingame-game-state/game-data-structure/Game";
import hourglassImage from "../../../public/images/icons/hourglass.svg";
import mammothImage from "../../../public/images/icons/mammoth.svg";
import IngameGameState from "../../common/ingame-game-state/IngameGameState";
import GameClient from "../GameClient";
import MapControls from "../MapControls";
import GameTabsComponent from "./GameTabsComponent";
import Player from "../../common/ingame-game-state/Player";
import { Channel } from "../chat-client/ChatClient";
import User from "../../server/User";

interface GameStateColumnProps {
  ingame: IngameGameState;
  gameClient: GameClient;
  mapControls: MapControls;
  authenticatedPlayer: Player | null;
  publicChatRoom: Channel;
  user: User | null;
}

export default class GameStateColumn extends Component<GameStateColumnProps> {
  render(): ReactNode {
    const { ingame, gameClient, mapControls } = this.props;

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

    const gameRunning = !ingame.isEndedOrCancelled;
    const roundWarning =
      gameRunning && ingame.game.maxTurns - ingame.game.turn == 1;
    const roundCritical =
      gameRunning && ingame.game.turn == ingame.game.maxTurns;

    const wildlingsWarning =
      gameRunning && ingame.game.wildlingStrength == MAX_WILDLING_STRENGTH - 4;
    const wildlingsCritical =
      gameRunning &&
      (ingame.game.wildlingStrength == MAX_WILDLING_STRENGTH ||
        ingame.game.wildlingStrength == MAX_WILDLING_STRENGTH - 2);

    const isOwnTurn = gameClient.isOwnTurn();
    const border = isOwnTurn
      ? "warning"
      : ingame.childGameState instanceof CancelledGameState
        ? "danger"
        : undefined;

    const isPhaseActive = (phase: any): boolean =>
      ingame.childGameState instanceof phase.gameState;

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
                      mapControls: mapControls,
                      gameClient,
                      gameState: ingame,
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
                          Round {ingame.game.turn} / {ingame.game.maxTurns}
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
                        {ingame.game.turn}
                      </div>
                    </div>
                  </OverlayTrigger>
                </Row>
                <Row className="mr-0">
                  <div>
                    <OverlayTrigger
                      overlay={
                        <Tooltip id="wildling-tooltip">
                          Wildling Strength: {ingame.game.wildlingStrength}
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
          authenticatedPlayer={this.props.authenticatedPlayer}
          gameClient={this.props.gameClient}
          ingame={this.props.ingame}
          mapControls={this.props.mapControls}
          publicChatRoom={this.props.publicChatRoom}
          user={this.props.user}
        />
      </div>
    );
  }
}
