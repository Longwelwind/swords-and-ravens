import {observer} from "mobx-react";
import {Component, default as React, ReactNode} from "react";
import EntireGame from "../common/EntireGame";
import LobbyGameState from "../common/lobby-game-state/LobbyGameState";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import CancelledGameState from "../common/cancelled-game-state/CancelledGameState";
import Col from "react-bootstrap/Col";
import Badge from "react-bootstrap/Badge";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { preventOverflow } from "@popperjs/core";
import _ from "lodash";
import GameEndedGameState from "../common/ingame-game-state/game-ended-game-state/GameEndedGameState";
import { secondsToString } from "./utils/secondsToString";
import { GameResumed } from "../common/ingame-game-state/game-data-structure/GameLog";
import { getTimeDeltaInSeconds } from "../utils/getElapsedSeconds";


interface ClockComponentProps {
    entireGame: EntireGame;
}

@observer
export default class ClockComponent extends Component<ClockComponentProps> {
    get now(): Date {
        return this.props.entireGame.now;
    }

    get ingame(): IngameGameState | null {
        return this.props.entireGame.ingameGameState;
    }

    get lobby(): LobbyGameState | null {
        return this.props.entireGame.lobbyGameState;
    }

    get isGameEnded(): boolean {
        return this.props.entireGame.leafState instanceof CancelledGameState ||
            this.props.entireGame.leafState instanceof GameEndedGameState;
    }

    render(): ReactNode {
        if (this.ingame?.willBeAutoResumedAt) {
            // Show a 10 minutes countdown
            const countdown = secondsToString(getTimeDeltaInSeconds(this.ingame?.willBeAutoResumedAt, this.now), true);

            return <Col xs="auto">
                <OverlayTrigger
                    placement="bottom"
                    overlay={
                        <Tooltip id="game-resumes-tooltip">
                            <b>Countdown until game resumes</b> <small><i>(hh:mm:ss)</i></small>
                        </Tooltip>}
                    popperConfig={{ modifiers: [preventOverflow] }}
                >
                    <h4><Badge variant="secondary">{countdown}</Badge></h4>
                </OverlayTrigger>
            </Col>;
        } else if (this.ingame) {
            let totalPlayingTime: string | null = null;
            const gameLogManager = this.props.entireGame.ingameGameState?.gameLogManager;
            const firstLog = _.first(gameLogManager?.logs ?? []);

            if (firstLog) {
                const lastTimeStamp = this.ingame.paused
                    ? this.ingame.paused
                    : this.isGameEnded
                        ? _.last(gameLogManager?.logs ?? [])?.time ?? this.now
                        : this.now;

                // Remove pause times:
                const totalPauseTime = _.sum(gameLogManager?.logs.filter(l => l.data.type == "game-resumed")
                    .map(l => (l.data as GameResumed).pauseTimeInSeconds));

                let elapsed = getTimeDeltaInSeconds(lastTimeStamp, firstLog.time);
                elapsed -= totalPauseTime;

                totalPlayingTime = secondsToString(elapsed);
            }

            return totalPlayingTime && <Col xs="auto">
                <OverlayTrigger
                    placement="bottom"
                    overlay={
                        <Tooltip id="total-playing-time-tooltip">
                            <b>Total playing time</b> <small><i>(hh:mm)</i></small>
                        </Tooltip>}
                    popperConfig={{ modifiers: [preventOverflow] }}
                >
                    <h4><Badge variant="secondary">{totalPlayingTime}</Badge></h4>
                </OverlayTrigger>
            </Col>;
        } else if (this.lobby && this.lobby.readyCheckWillTimeoutAt) {
            // Show a 30 seconds countdown
            const countdown = getTimeDeltaInSeconds(this.lobby.readyCheckWillTimeoutAt, this.now);

            return <Col xs="auto">
                <OverlayTrigger
                    placement="bottom"
                    overlay={
                        <Tooltip id="ready-check-countdown-tooltip">
                            <b>Countdown for Ready Check</b>
                        </Tooltip>}
                    popperConfig={{ modifiers: [preventOverflow] }}
                >
                    <h4><Badge variant="secondary">{countdown}</Badge></h4>
                </OverlayTrigger>
            </Col>;
        }else if (this.lobby) {
            return <Col xs="auto">
                <OverlayTrigger
                    placement="bottom"
                    overlay={
                        <Tooltip id="westeros-time-tooltip">
                            <b>Current UTC time</b> <small><i>(hh:mm)</i></small>
                        </Tooltip>}
                    popperConfig={{ modifiers: [preventOverflow] }}
                >
                    <h4><Badge variant="secondary">{this.now.toISOString().slice(11, 16)}</Badge></h4>
                </OverlayTrigger>
            </Col>
        }

        return null;
    }
}
