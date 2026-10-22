import { t, Trans } from "../i18n";
import { observer } from "mobx-react";
import DeclareSupportGameState from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/declare-support-game-state/DeclareSupportGameState";
import { Component, ReactNode } from "react";
import React from "react";
import GameStateComponentProps from "./GameStateComponentProps";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import House from "../../common/ingame-game-state/game-data-structure/House";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import ConditionalWrap from "../utils/ConditionalWrap";

@observer
export default class DeclareSupportComponent extends Component<
  GameStateComponentProps<DeclareSupportGameState>
> {
  render(): ReactNode {
    return (
      <>
        <Col xs={12} className="text-center">
          <Trans
            i18nKey="declareSupport.maySupportOneBelligerentOfTheFight0f1430"
            values={{ house: this.props.gameState.house.name }}
          />
        </Col>
        <Col xs={12}>
          {this.props.gameClient.doesControlHouse(
            this.props.gameState.house
          ) ? (
            <Row className="justify-content-center">
              {this.props.gameState.combatGameState.houseCombatDatas.keys.map(
                (h) => (
                  <Col xs="auto" key={`declare-support_${h.id}`}>
                    <ConditionalWrap
                      condition={!this.canChoose(h)}
                      wrap={(c) => (
                        <OverlayTrigger
                          overlay={
                            <Tooltip id="support-choice-restricted">
                              {t(
                                "declareSupport.youCanTSupportTheEnemyInACombatdc401c"
                              )}
                            </Tooltip>
                          }
                        >
                          {c}
                        </OverlayTrigger>
                      )}
                    >
                      <Button
                        type="button"
                        onClick={() => this.choose(h)}
                        disabled={!this.canChoose(h)}
                      >
                        {h.name} (
                        {h == this.props.gameState.combatGameState.attacker
                          ? t("declareSupport.attacker2969c6")
                          : t("declareSupport.defender157ddc")}
                        )
                      </Button>
                    </ConditionalWrap>
                  </Col>
                )
              )}
              <Col xs="auto">
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => this.choose(null)}
                >
                  {t("declareSupport.nonedc937b")}
                </Button>
              </Col>
            </Row>
          ) : (
            <div className="text-center">
              <Trans
                i18nKey="declareSupport.waitingForToDeclareItsSupport0029a4"
                values={{
                  house:
                    this.props.gameState.ingameGameState.getControllerOfHouse(
                      this.props.gameState.house
                    ).house.name
                }}
              />
            </div>
          )}
        </Col>
      </>
    );
  }

  canChoose(supportedHouse: House): boolean {
    return this.props.gameState.combatGameState.isRestrictedToHimself(
      this.props.gameState.house
    )
      ? supportedHouse == this.props.gameState.house
      : true;
  }

  choose(house: House | null): void {
    this.props.gameState.choose(house);
  }
}
