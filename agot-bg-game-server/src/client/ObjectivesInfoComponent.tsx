import { t, Trans } from "./i18n";
import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import * as React from "react";
import { Col, OverlayTrigger, Row, Tooltip } from "react-bootstrap";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import Game from "../common/ingame-game-state/game-data-structure/Game";
import {
  specialObjectiveCards,
  objectiveCards
} from "../common/ingame-game-state/game-data-structure/static-data-structure/objectiveCards";
import ObjectiveCardComponent from "./game-state-panel/utils/ObjectiveCardComponent";
import GameClient from "./GameClient";
import _ from "lodash";
import Player from "../common/ingame-game-state/Player";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBookReader,
  faQuestionCircle
} from "@fortawesome/free-solid-svg-icons";
import { OverlayChildren } from "react-bootstrap/Overlay";

interface ObjectivesInfoComponentProps {
  ingame: IngameGameState;
  gameClient: GameClient;
}

@observer
export default class ObjectivesInfoComponent extends Component<ObjectivesInfoComponentProps> {
  get ingame(): IngameGameState {
    return this.props.ingame;
  }

  get game(): Game {
    return this.props.ingame.game;
  }

  get authenticatedPlayer(): Player | null {
    return this.props.gameClient.authenticatedPlayer;
  }

  render(): ReactNode {
    const allCompletedObjectives = _.flatMap(
      this.game.houses.values,
      (h) => h.completedObjectives
    );
    const playersSecretObjectives = this.authenticatedPlayer
      ? this.authenticatedPlayer.house.secretObjectives
      : [];
    const allAvailableObjectives = _.sortBy(
      _.without(
        objectiveCards.values,
        ...allCompletedObjectives,
        ...playersSecretObjectives
      ),
      (oc) => oc.name
    );
    return (
      <Col xs={12} className="h-100">
        {playersSecretObjectives.length > 0 && (
          <Row className="justify-content-center">
            <Col xs={12}>
              <h5 className="mb-0 text-center">
                {t("objectivesInfo.yourSecretObjectives487261")}
              </h5>
            </Col>
            {playersSecretObjectives.map((oc) => (
              <Col xs="auto" key={`secret-objective_${oc.id}`}>
                <ObjectiveCardComponent objectiveCard={oc} size="medium" />
              </Col>
            ))}
          </Row>
        )}
        <Row className="justify-content-center mt-4">
          <Col xs={12}>
            <h5 className="mb-0 text-center">
              {t("objectivesInfo.allSpecialObjectives1825af")}
            </h5>
          </Col>
          {specialObjectiveCards.values.map((oc) => (
            <Col xs="auto" key={`special-objective_${oc.id}`}>
              <ObjectiveCardComponent objectiveCard={oc} size="smedium" />
            </Col>
          ))}
        </Row>
        {this.game.houses.values
          .filter((h) => h.completedObjectives.length > 0)
          .map((h) => (
            <Row
              className="justify-content-center mt-4"
              key={`completed-objectives_${h.id}`}
            >
              <Col xs={12}>
                <h5 className="mb-0 text-center">
                  <Trans
                    i18nKey="objectivesInfo.sCompletedObjectives4e0446"
                    values={{ house: h.name }}
                  />
                </h5>
              </Col>
              {h.completedObjectives.map((oc) => (
                <Col xs="auto" key={`completed-objective_${h.id}_${oc.id}`}>
                  <ObjectiveCardComponent objectiveCard={oc} size="tiny" />
                </Col>
              ))}
            </Row>
          ))}
        <Row className="justify-content-center mt-4">
          <Col xs={12}>
            <h5 className="mb-0 text-center">
              {this.authenticatedPlayer || allCompletedObjectives.length > 0
                ? t("objectivesInfo.remainingObjectives87510d")
                : t("objectivesInfo.allObjectives6da2b1")}
            </h5>
          </Col>
          {allAvailableObjectives.map((oc) => (
            <Col xs="auto" key={`all-objectives_${oc.id}`}>
              <ObjectiveCardComponent objectiveCard={oc} size="tiny" />
            </Col>
          ))}
        </Row>
        <Row className="justify-content-center mt-4 clickable">
          <Col xs={12}>
            <OverlayTrigger
              overlay={this.renderRulesTooltip()}
              trigger="click"
              rootClose
              placement="auto"
            >
              <h5 className="mb-0 text-center">
                <FontAwesomeIcon
                  style={{ fontSize: "1.25rem" }}
                  icon={faBookReader}
                />
                <span className="px-2">{t("objectivesInfo.rules4228ae")}</span>
                <FontAwesomeIcon
                  style={{ fontSize: "1.25rem" }}
                  icon={faQuestionCircle}
                />
              </h5>
            </OverlayTrigger>
          </Col>
        </Row>
      </Col>
    );
  }

  renderRulesTooltip(): OverlayChildren {
    return (
      <Tooltip id="affc-rules-tooltip" className="tooltip-w-100">
        <Trans
          i18nKey="objectivesInfo.theAFeastForCrowsScenarioIntroducesANewed21a9"
          components={{
            details: <h5 className="text-center">{t("common.objectives")}</h5>,
            lineBreak: <br />,
            lineBreak2: <br />,
            lineBreak3: <br />,
            lineBreak4: <br />,
            lineBreak5: <br />,
            details2: (
              <h5 className="text-center">
                {t("objectivesInfo.scoringAndSupply9e93ab")}
              </h5>
            ),
            lineBreak6: <br />,
            details3: (
              <ol className="mb-0 mt-1">
                <li>
                  <Trans
                    i18nKey="objectivesInfo.updateSupplyInTurnOrderAllPlayersUpdateTheir1bd566"
                    components={{ bold: <b />, lineBreak: <br /> }}
                  />
                </li>
                <li>
                  <Trans
                    i18nKey="objectivesInfo.scoreSpecialObjectivesEachRoundDuringThisStepEachb75030"
                    components={{ bold: <b />, lineBreak: <br /> }}
                  />
                </li>
                <li>
                  <Trans
                    i18nKey="objectivesInfo.scoreOtherObjectivesInTurnOrderEachPlayerMayb216b1"
                    components={{
                      bold: <b />,
                      lineBreak: <br />,
                      lineBreak2: <br />,
                      lineBreak3: <br />,
                      lineBreak4: <br />
                    }}
                  />
                </li>
                <li>
                  <Trans
                    i18nKey="objectivesInfo.drawObjectiveCardsAnyPlayerWhoDoesNotHave23ffea"
                    components={{ bold: <b />, lineBreak: <br /> }}
                  />
                </li>
              </ol>
            ),
            lineBreak7: <br />,
            details4: (
              <h5 className="text-center">
                {t("objectivesInfo.winningTheGamee9057e")}
              </h5>
            ),
            lineBreak8: <br />,
            lineBreak9: <br />,
            lineBreak10: <br />,
            lineBreak11: <br />,
            details5: <h5 className="text-center">{t("common.faq")}</h5>,
            emphasis: <i />,
            lineBreak12: <br />,
            lineBreak13: <br />
          }}
        />
      </Tooltip>
    );
  }
}
