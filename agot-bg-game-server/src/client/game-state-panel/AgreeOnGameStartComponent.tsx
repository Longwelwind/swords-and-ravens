import { t, Trans } from "../i18n";
import { Component, ReactNode } from "react";
import * as React from "react";
import { observer } from "mobx-react";
import GameStateComponentProps from "./GameStateComponentProps";
import Row from "react-bootstrap/Row";
import Player from "../../common/ingame-game-state/Player";
import { Button, Col } from "react-bootstrap";
import AgreeOnGameStartGameState from "../../common/ingame-game-state/draft-game-state/agree-on-game-start-game-state/AgreeOnGameStartGameState";

@observer
export default class AgreeOnGameStartComponent extends Component<
  GameStateComponentProps<AgreeOnGameStartGameState>
> {
  get player(): Player | null {
    return this.props.gameClient.authenticatedPlayer;
  }

  get isParticipatingInDraft(): boolean {
    return (
      this.player != null &&
      this.props.gameState.parentGameState.participatingHouses.includes(
        this.player.house
      )
    );
  }

  render(): ReactNode {
    return (
      <>
        <Row className="justify-content-center">
          <Col xs={12} className="text-center">
            {t("agreeOnGameStart.allPlayersMustAgreeToStartTheGame97c070")}
          </Col>
        </Row>
        {this.isParticipatingInDraft && this.player != null && (
          <Row className="justify-content-center">
            <Col xs="auto">
              <Button
                type="button"
                disabled={this.props.gameState.readyHouses.includes(
                  this.player.house
                )}
                onClick={() => this.props.gameState.agree()}
                variant="success"
              >
                {t("agreeOnGameStart.agreeda2886")}
              </Button>
            </Col>
            <Col xs="auto">
              <Button
                type="button"
                onClick={() => this.props.gameState.disagree()}
                variant="danger"
              >
                {t("agreeOnGameStart.disagree2f4482")}
              </Button>
            </Col>
          </Row>
        )}
        <Row className="mt-3 justify-content-center">
          <Col xs={12} className="text-center">
            <Trans
              i18nKey="common.waitingFor"
              values={{
                houses: this.props.gameState
                  .getNotReadyPlayers()
                  .map((p) => p.house.name)
                  .join(", ")
              }}
            />
          </Col>
        </Row>
      </>
    );
  }
}
