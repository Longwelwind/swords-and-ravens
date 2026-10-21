import { t, Trans } from "../i18n";
import joinNaturalLanguage from "../utils/joinNaturalLanguage";
import { observer } from "mobx-react";
import * as React from "react";
import { Component } from "react";
import ChooseHouseCardGameState from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/choose-house-card-game-state/ChooseHouseCardGameState";
import HouseCard from "../../common/ingame-game-state/game-data-structure/house-card/HouseCard";
import GameStateComponentProps from "./GameStateComponentProps";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import HouseCardComponent from "./utils/HouseCardComponent";
import { observable } from "mobx";
import CombatGameState from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import Player from "../../common/ingame-game-state/Player";
import { FormCheck, OverlayTrigger, Tooltip } from "react-bootstrap";
import House from "../../common/ingame-game-state/game-data-structure/House";

@observer
export default class ChooseHouseCardComponent extends Component<
  GameStateComponentProps<ChooseHouseCardGameState>
> {
  @observable accessor dontSkipVsbQuestion: boolean;

  get chosenHouseCard(): HouseCard | null {
    const commandedHouse = this.tryGetCommandedHouseInCombat();
    if (!commandedHouse) {
      return null;
    }

    return this.props.gameState.houseCards.tryGet(commandedHouse, null);
  }

  get combat(): CombatGameState {
    return this.props.gameState.combatGameState;
  }

  get authenticatedPlayer(): Player | null {
    return this.props.gameClient.authenticatedPlayer;
  }

  get isValyrianSteelBladeHolder(): boolean {
    return this.authenticatedPlayer
      ? this.authenticatedPlayer.house ==
          this.props.gameState.combatGameState.game.valyrianSteelBladeHolder
      : false;
  }

  get selectedHouseCard(): HouseCard | null {
    return this.props.gameState.selectedHouseCard;
  }

  set selectedHouseCard(value: HouseCard | null) {
    this.props.gameState.selectedHouseCard = value;
  }

  get dirty(): boolean {
    const commandedHouse = this.tryGetCommandedHouseInCombat();
    if (!commandedHouse) {
      return false;
    }

    return (
      this.selectedHouseCard != this.chosenHouseCard ||
      this.combat.dontSkipVsbQuestion != this.dontSkipVsbQuestion
    );
  }

  constructor(props: GameStateComponentProps<ChooseHouseCardGameState>) {
    super(props);
    this.selectedHouseCard = this.chosenHouseCard;
    const commandedHouse = this.tryGetCommandedHouseInCombat();
    this.dontSkipVsbQuestion =
      commandedHouse != null &&
      this.props.gameState.combatGameState.dontSkipVsbQuestion;
  }

  tryGetCommandedHouseInCombat(): House | null {
    return this.combat.tryGetCommandedHouseInCombat(
      this.props.gameClient.authenticatedPlayer
    );
  }

  render(): React.JSX.Element {
    const waitingFor = this.props.gameState.getWaitingForHouses();
    const commandedHouse = this.tryGetCommandedHouseInCombat();
    const supportingHouses =
      this.props.gameState.getSupportingHouses(commandedHouse);
    return this.combat.stats.length > 0 ? (
      <></>
    ) : (
      <>
        <Col xs={12} className="text-center">
          {t("chooseHouseCard.theAttackerAndTheDefenderMustChooseAHouse2c46fa")}
        </Col>
        {this.shouldChooseHouseCard() && (
          <>
            <Col xs={12}>
              <Row className="justify-content-center">
                {this.getChoosableHouseCards().map((hc) => (
                  <Col
                    xs="auto"
                    key={`choose-hc_${hc.id}`}
                    style={{
                      paddingRight: 6,
                      paddingLeft: 6,
                      paddingBottom: 4,
                      paddingTop: 4
                    }}
                  >
                    <HouseCardComponent
                      houseCard={hc}
                      size="small"
                      selected={this.selectedHouseCard == hc}
                      onClick={() => {
                        if (hc != this.selectedHouseCard) {
                          this.selectedHouseCard = hc;
                        }
                      }}
                    />
                  </Col>
                ))}
              </Row>
            </Col>
            <Col xs={12}>
              {this.isValyrianSteelBladeHolder &&
                !this.props.gameState.combatGameState.game
                  .valyrianSteelBladeUsed && (
                  <Row className="justify-content-center">
                    <Col xs="auto">
                      <FormCheck
                        id="dont-skip-vsb-question"
                        type="switch"
                        label={
                          <OverlayTrigger
                            overlay={
                              <Tooltip id="donst-skip-vsb-tooltip">
                                <Trans
                                  i18nKey="chooseHouseCard.inCaseThe1BonusWonTAffectTheb02ea3"
                                  components={{
                                    element0: <br />,
                                    element1: <br />
                                  }}
                                />
                              </Tooltip>
                            }
                          >
                            <label htmlFor="dont-skip-vsb-question">
                              {t(
                                "chooseHouseCard.donTSkipVsbBonusQuestion56dd52"
                              )}
                            </label>
                          </OverlayTrigger>
                        }
                        checked={this.dontSkipVsbQuestion}
                        onChange={() => {
                          this.dontSkipVsbQuestion = !this.dontSkipVsbQuestion;
                        }}
                        style={{ zIndex: "auto" }}
                      />
                    </Col>
                  </Row>
                )}
              <Row className="justify-content-center">
                <Col xs="auto">
                  <Button
                    type="button"
                    variant="success"
                    onClick={() => this.chooseHouseCard()}
                    disabled={!this.dirty || this.selectedHouseCard == null}
                  >
                    {t("common.confirm")}
                  </Button>
                </Col>
              </Row>
              {this.props.gameClient.authenticatedPlayer &&
                this.props.gameState.canRefuseSupport(commandedHouse) && (
                  <Row className="justify-content-center mt-2">
                    {supportingHouses.length > 1 && (
                      <Col xs="auto" key={`refuse-support-from-all`}>
                        <Button
                          type="button"
                          variant="warning"
                          onClick={() => {
                            if (
                              window.confirm(
                                t(
                                  "chooseHouseCard.areYouSureYouWantToRefuseAllThe14713d"
                                )
                              )
                            ) {
                              this.props.gameState.refuseSupport();
                            }
                          }}
                        >
                          {t("chooseHouseCard.refuseAllReceivedSupportd59ddf")}
                        </Button>
                      </Col>
                    )}
                    {supportingHouses.map((supportingHouse) => (
                      <Col
                        xs="auto"
                        key={`refuse-support-from-${supportingHouse.id}`}
                      >
                        <Button
                          type="button"
                          variant="warning"
                          onClick={() => {
                            if (
                              window.confirm(
                                commandedHouse == supportingHouse
                                  ? t(
                                      "chooseHouseCard.areYouSureYouWantToRefuseYourOwn97bdc7"
                                    )
                                  : t("chooseHouseCard.confirmRefuseSupport", {
                                      house: supportingHouse.name
                                    })
                              )
                            ) {
                              this.props.gameState.refuseSupport(
                                supportingHouse
                              );
                            }
                          }}
                        >
                          {commandedHouse == supportingHouse
                            ? t("chooseHouseCard.refuseOwnSupport6e9b1f")
                            : t("chooseHouseCard.refuseSupportFrom3f7482", {
                                value0: supportingHouse.name
                              })}
                        </Button>
                      </Col>
                    ))}
                  </Row>
                )}
            </Col>
          </>
        )}
        <Col xs={12} className="text-center">
          <div>
            <Trans
              i18nKey="chooseHouseCard.waitingForToChooseTheir05a4e8"
              components={{
                value0: (
                  <>
                    {joinNaturalLanguage(
                      waitingFor.map(
                        (h) =>
                          this.combat.ingameGameState.getControllerOfHouse(h)
                            .house.name
                      )
                    )}
                  </>
                ),
                value1: (
                  <>
                    {t("common.HousecardLabel", { count: waitingFor.length })}
                  </>
                )
              }}
            />
          </div>
        </Col>
      </>
    );
  }

  shouldChooseHouseCard(): boolean {
    return this.props.gameState.combatGameState.houseCombatDatas.keys.some(
      (h) => this.props.gameClient.doesControlHouse(h)
    );
  }

  chooseHouseCard(): void {
    if (!this.selectedHouseCard) {
      return;
    }

    this.props.gameState.chooseHouseCard(
      this.selectedHouseCard,
      this.dontSkipVsbQuestion
    );
  }

  getChoosableHouseCards(): HouseCard[] {
    const commandedHouse = this.tryGetCommandedHouseInCombat();
    if (!commandedHouse) {
      return [];
    }
    return this.props.gameState.getChoosableCards(commandedHouse);
  }
}
