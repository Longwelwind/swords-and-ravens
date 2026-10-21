import { t, Trans } from "../i18n";
import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import SeeTopWildlingCardGameState from "../../common/ingame-game-state/action-game-state/use-raven-game-state/see-top-wildling-card-game-state/SeeTopWildlingCardGameState";
import React from "react";
import GameStateComponentProps from "./GameStateComponentProps";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import { SeeTopWildlingCardAction } from "../../messages/ClientMessage";
import WildlingCardComponent from "./utils/WildlingCardComponent";

@observer
export default class SeeTopWildlingCardComponent extends Component<
  GameStateComponentProps<SeeTopWildlingCardGameState>
> {
  render(): ReactNode {
    return (
      <>
        <Col xs={12} className="text-center">
          {t(
            "seeTopWildlingCard.theHolderOfTheMessengerRavenSeesTheCarde24e41"
          )}
        </Col>
        <Col xs={12}>
          {this.props.gameState.topWildlingCard && (
            <Row className="justify-content-center">
              {this.props.gameClient.doesControlHouse(
                this.props.gameState.ravenHolder
              ) && (
                <Col xs="auto">
                  <WildlingCardComponent
                    cardType={this.props.gameState.topWildlingCard.type}
                    size="fairly"
                    tooltip
                  />
                </Col>
              )}
            </Row>
          )}
        </Col>
        <Col xs={12} className="text-center">
          {this.props.gameClient.doesControlHouse(
            this.props.gameState.ravenHolder
          ) ? (
            <Row className="justify-content-center">
              <Col xs="auto">
                <Button
                  type="button"
                  onClick={() =>
                    this.choose(SeeTopWildlingCardAction.LEAVE_AT_THE_TOP)
                  }
                >
                  {t("seeTopWildlingCard.keepAtTheTop0f17eb")}
                </Button>
              </Col>
              <Col xs="auto">
                <Button
                  type="button"
                  onClick={() =>
                    this.choose(SeeTopWildlingCardAction.PUT_AT_BOTTOM)
                  }
                >
                  {t("seeTopWildlingCard.putAtTheBottom79c80f")}
                </Button>
              </Col>
            </Row>
          ) : (
            <Col xs={12} className="text-center">
              <Trans
                i18nKey="common.waitingFor"
                components={{
                  houses: <>{this.props.gameState.ravenHolder.name}</>
                }}
              />
            </Col>
          )}
        </Col>
      </>
    );
  }

  choose(action: SeeTopWildlingCardAction): void {
    this.props.gameState.choose(action);
  }
}
