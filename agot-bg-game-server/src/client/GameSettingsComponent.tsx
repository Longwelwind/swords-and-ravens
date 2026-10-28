import { t, Trans } from "./i18n";
import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import * as React from "react";
import FormCheck from "react-bootstrap/FormCheck";
import GameClient from "./GameClient";
import { GameSettings, HouseCardDecks } from "../common/GameSettings";
import EntireGame from "../common/EntireGame";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import LobbyGameState from "../common/lobby-game-state/LobbyGameState";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import {
  allGameSetups,
  getGameSetupContainer
} from "../common/ingame-game-state/game-data-structure/createGame";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import { isMobile } from "react-device-detect";

interface GameSettingsComponentProps {
  gameClient: GameClient;
  entireGame: EntireGame;
}

@observer
export default class GameSettingsComponent extends Component<GameSettingsComponentProps> {
  get entireGame(): EntireGame {
    return this.props.entireGame;
  }

  get gameSettings(): GameSettings {
    return this.entireGame.gameSettings;
  }

  get canChangeGameSettings(): boolean {
    if (this.entireGame.lobbyGameState) {
      return this.props.gameClient.isRealOwner();
    } else if (this.entireGame.ingameGameState) {
      return this.props.gameClient.canActAsOwner();
    }
    return false;
  }

  get selectedGameSetupName(): string {
    const name = allGameSetups.get(
      this.props.entireGame.gameSettings.setupId
    ).name;
    return name.substring(0, name.indexOf(" ("));
  }

  render(): ReactNode {
    const isIngame =
      this.props.entireGame.childGameState instanceof IngameGameState;
    return (
      <Col id="game-settings-container" xs={12} className="mt-2">
        <Row id="live-pbem-row" className="justify-content-center mb-2">
          {isIngame && (
            <Col xs={12} className="text-center mb-2">
              {this.selectedGameSetupName}
            </Col>
          )}
          <Row className="justify-content-center">
            <Col xs={12} className="d-flex align-items-center">
              {isIngame && this.props.entireGame.gameSettings.onlyLive ? (
                <></>
              ) : (
                <OverlayTrigger
                  overlay={
                    <Tooltip id="pbem-tooltip">
                      <Trans
                        i18nKey="gameSettings.liveGameALiveGameCanBePlayedWhenc2f959"
                        components={{
                          bold: <b />,
                          lineBreak: <br />,
                          lineBreak2: <br />,
                          lineBreak3: <br />,
                          bold2: <b />,
                          bold3: <b />,
                          bold4: <b />,
                          bold5: <b />,
                          lineBreak4: <br />
                        }}
                      />
                    </Tooltip>
                  }
                >
                  <select
                    id="pbem-setting"
                    name="pbem"
                    value={this.gameSettings.pbem ? "PBEM" : "Live"}
                    onChange={(e) =>
                      this.changeGameSettings(
                        () =>
                          (this.gameSettings.pbem = e.target.value == "PBEM")
                      )
                    }
                  >
                    <option key="Live" value="Live">
                      {t("gameSettings.liveGame5604db")}
                    </option>
                    <option key="PBEM" value="PBEM">
                      {t("gameSettings.playByEMailcdf5d9")}
                    </option>
                  </select>
                </OverlayTrigger>
              )}
              {this.gameSettings.pbem && !isIngame && (
                <FormCheck
                  id="start-when-full-setting"
                  className="mx-3 mt-2"
                  type="switch"
                  label={
                    <OverlayTrigger
                      overlay={
                        <Tooltip id="start-when-full-setting-tooltip">
                          {t(
                            "gameSettings.ifThisOptionIsEnabledTheGameWillStart3f9a2c"
                          )}
                        </Tooltip>
                      }
                    >
                      <label htmlFor="start-when-full-setting">
                        {t("gameSettings.startWhenFull37777f")}
                      </label>
                    </OverlayTrigger>
                  }
                  checked={this.gameSettings.startWhenFull}
                  onChange={() =>
                    this.changeGameSettings(
                      () =>
                        (this.gameSettings.startWhenFull =
                          !this.gameSettings.startWhenFull)
                    )
                  }
                />
              )}
              {!this.gameSettings.pbem && !isIngame && (
                <FormCheck
                  id="only-live-setting"
                  className="mx-3 mt-2"
                  type="switch"
                  label={
                    <OverlayTrigger
                      overlay={
                        <Tooltip
                          id="only-live-setting-tooltip"
                          className="tooltip-w-100"
                        >
                          <Trans
                            i18nKey="gameSettings.ifThisOptionIsEnabledEachPlayerWillHaveffd163"
                            components={{
                              lineBreak: <br />,
                              lineBreak2: <br />,
                              lineBreak3: <br />,
                              lineBreak4: <br />,
                              lineBreak5: <br />,
                              lineBreak6: <br />
                            }}
                          />
                        </Tooltip>
                      }
                    >
                      <label htmlFor="only-live-setting">
                        {t("gameSettings.gameClockdd5488")}
                      </label>
                    </OverlayTrigger>
                  }
                  checked={this.gameSettings.onlyLive}
                  onChange={() =>
                    this.changeGameSettings(
                      () =>
                        (this.gameSettings.onlyLive =
                          !this.gameSettings.onlyLive)
                    )
                  }
                />
              )}
              {this.gameSettings.onlyLive && !isIngame && (
                <div>
                  <Trans
                    i18nKey="gameSettings.min9aef64"
                    components={{
                      details: (
                        <select
                          id="initial-live-clock"
                          value={this.gameSettings.initialLiveClock}
                          onChange={(e) =>
                            this.onInitialLiveClockChange(e.target.value)
                          }
                        >
                          <option key="30" value={30}>
                            30
                          </option>
                          <option key="45" value={45}>
                            45
                          </option>
                          <option key="60" value={60}>
                            60
                          </option>
                          <option key="75" value={75}>
                            75
                          </option>
                          <option key="90" value={90}>
                            90
                          </option>
                          <option key="120" value={120}>
                            120
                          </option>
                        </select>
                      )
                    }}
                  />
                </div>
              )}
              {this.gameSettings.onlyLive && !isIngame && (
                <FormCheck
                  id="fixed-clock-setting"
                  className="mx-3 mt-2"
                  type="switch"
                  label={
                    <OverlayTrigger
                      overlay={
                        <Tooltip id="fixed-clock-setting-tooltip">
                          {t(
                            "gameSettings.ifThisOptionIsEnabledPlayersWillNotBe6c9e87"
                          )}
                        </Tooltip>
                      }
                    >
                      <label htmlFor="fixed-clock-setting">
                        {t("gameSettings.fixedClockd8e378")}
                      </label>
                    </OverlayTrigger>
                  }
                  checked={this.gameSettings.fixedClock}
                  onChange={() =>
                    this.changeGameSettings(
                      () =>
                        (this.gameSettings.fixedClock =
                          !this.gameSettings.fixedClock)
                    )
                  }
                />
              )}
              {!isIngame && (
                <FormCheck
                  id="private-game-setting"
                  className="mx-3 mt-2"
                  type="switch"
                  label={
                    <OverlayTrigger
                      overlay={
                        <Tooltip id="private-game-setting-tooltip">
                          {t(
                            "gameSettings.enableThisOptionIfYouKnowAllParticipantsAnd1caeed"
                          )}
                        </Tooltip>
                      }
                    >
                      <label htmlFor="private-game-setting">
                        {t("gameSettings.privateGameb84ee7")}
                      </label>
                    </OverlayTrigger>
                  }
                  checked={this.gameSettings.private}
                  onChange={() =>
                    this.changeGameSettings(
                      () =>
                        (this.gameSettings.private = !this.gameSettings.private)
                    )
                  }
                />
              )}
            </Col>
          </Row>
        </Row>
        {this.props.entireGame.childGameState instanceof LobbyGameState &&
          this.renderLobbySettings()}
      </Col>
    );
  }

  renderGameSetupsTooltipContent(): ReactNode {
    switch (this.gameSettings.setupId) {
      case "base-game":
        return (
          <>
            <Trans
              i18nKey="gameSettings.thisSetupSupports3PlayerAnd6PlayerModesd2e9ce"
              components={{
                details: (
                  <h5>
                    <Trans
                      i18nKey="gameSettings.theOfficialAGameOfThronesBoardGame2nd358ef9"
                      components={{ emphasis: <i /> }}
                    />
                  </h5>
                ),
                lineBreak: <br />,
                lineBreak2: <br />
              }}
            />
          </>
        );
      case "mother-of-dragons":
        return (
          <>
            <Trans
              i18nKey="gameSettings.thisExpansionAdds2AdditionalHousesArrynAndTargaryen723511"
              components={{
                details: (
                  <h5>
                    <Trans
                      i18nKey="gameSettings.theOfficialMotherOfDragonsExpansiona2949c"
                      components={{ emphasis: <i /> }}
                    />
                  </h5>
                ),
                lineBreak: <br />,
                lineBreak2: <br />
              }}
            />
          </>
        );
      case "a-dance-with-dragons":
        return (
          <>
            <Trans
              i18nKey="gameSettings.thisExpansionThematicallyReflectsALaterPointInThe9c9325"
              components={{
                details: (
                  <h5>
                    <Trans
                      i18nKey="gameSettings.theOfficialDanceWithDragonsExpansion7824b7"
                      components={{ emphasis: <i /> }}
                    />
                  </h5>
                ),
                lineBreak: <br />,
                emphasis: <i />,
                bold: <b />,
                lineBreak2: <br />
              }}
            />
          </>
        );
      case "a-feast-for-crows":
        return (
          <>
            <Trans
              i18nKey="gameSettings.thisIsA4PlayerExpansionItAddsHoused62d5f"
              components={{
                details: (
                  <h5>
                    <Trans
                      i18nKey="gameSettings.theOfficialAFeastForCrowsExpansionc31f91"
                      components={{ emphasis: <i /> }}
                    />
                  </h5>
                ),
                lineBreak: <br />,
                lineBreak2: <br />
              }}
            />
          </>
        );
      case "a-dance-with-mother-of-dragons":
        return (
          <>
            <Trans
              i18nKey="gameSettings.thisIsACommunityCreatedVariantAndCombinesA7d2a73"
              components={{
                details: (
                  <h5>
                    <Trans
                      i18nKey="gameSettings.theUnofficialADanceWithMotherOfDragonsVariantfa93ec"
                      components={{ emphasis: <i /> }}
                    />
                  </h5>
                ),
                emphasis: <i />,
                lineBreak: <br />,
                emphasis2: <i />,
                bold: <b />,
                lineBreak2: <br />
              }}
            />
          </>
        );
      case "struggle-in-the-north":
        return (
          <>
            <Trans
              i18nKey="gameSettings.thisIsACommunityCreatedVariantFor4Andb19cc8"
              components={{
                details: (
                  <h5>
                    <Trans
                      i18nKey="gameSettings.theUnofficialStruggleInTheNorthVariant93cc40"
                      components={{ emphasis: <i /> }}
                    />
                  </h5>
                ),
                lineBreak: <br />,
                lineBreak2: <br />
              }}
            />
          </>
        );
      case "rumble-in-the-south":
        return (
          <>
            <Trans
              i18nKey="gameSettings.thisIsACommunityCreatedVariantFor4Playersd25b60"
              components={{
                details: (
                  <h5>
                    <Trans
                      i18nKey="gameSettings.theUnofficialRumbeInTheSouthVariant044ba3"
                      components={{ emphasis: <i /> }}
                    />
                  </h5>
                ),
                lineBreak: <br />,
                lineBreak2: <br />
              }}
            />
          </>
        );
      case "race-to-kings-landing":
        return (
          <>
            <Trans
              i18nKey="gameSettings.thisIsACommunityCreatedVariantFor5Players6e4891"
              components={{
                details: (
                  <h5>
                    <Trans
                      i18nKey="gameSettings.theUnofficialRaceToKingsLandingVariant246958"
                      components={{ emphasis: <i /> }}
                    />
                  </h5>
                ),
                lineBreak: <br />
              }}
            />
          </>
        );
      case "no-kraken-for-dinner":
        return (
          <>
            <Trans
              i18nKey="gameSettings.thisIsACommunityCreatedVariantFor5Playersa4a230"
              components={{
                details: (
                  <h5>
                    <Trans
                      i18nKey="gameSettings.theUnofficialNoKrakenForDinnerVariant87fa1d"
                      components={{ emphasis: <i /> }}
                    />
                  </h5>
                ),
                lineBreak: <br />
              }}
            />
          </>
        );
      case "learn-the-game":
        return (
          <>
            <Trans
              i18nKey="gameSettings.thisModeAllowsYouToStartTheGameWithc24a61"
              components={{
                details: <h5>{t("gameSettings.teachTheGameMode7a34c3")}</h5>,
                lineBreak: <br />,
                lineBreak2: <br />,
                lineBreak3: <br />
              }}
            />
          </>
        );
      default:
        return null;
    }
  }

  renderLobbySettings(): ReactNode {
    return (
      <Row className="mt-2 justify-content-center">
        <Col xs="auto" id="base-settings-col" className="g-0">
          <OverlayTrigger
            overlay={
              <Tooltip id="game-setups-tooltip" className="tooltip-w-100">
                {this.renderGameSetupsTooltipContent()}
              </Tooltip>
            }
            placement="top"
            delay={{ show: 250, hide: 750 }}
          >
            <Col xs="12">
              <select
                className="form-select"
                id="game-setups"
                name="setups"
                value={this.gameSettings.setupId}
                onChange={(e) => this.onSetupChange(e.target.value)}
                style={{ marginBottom: "8px" }}
              >
                {this.createSetupItems()}
              </select>
            </Col>
          </OverlayTrigger>
          <Col xs="auto" className="d-flex justify-content-between">
            <div className="me-2">
              <Trans
                i18nKey="gameSettings.playersf220fc"
                components={{
                  details: (
                    <select
                      id="player-count"
                      name="playerCount"
                      value={this.gameSettings.playerCount}
                      onChange={(e) => this.onPlayerCountChange(e.target.value)}
                      style={{ marginBottom: "8px" }}
                    >
                      {this.createPlayerCountItems()}
                    </select>
                  )
                }}
              />
            </div>
            <OverlayTrigger
              overlay={
                <Tooltip id="vp-count-setting-tooltip">
                  {t(
                    "gameSettings.definesTheNumberOfVictoryPointsNeededToWin6f1829"
                  )}
                </Tooltip>
              }
            >
              <div>
                <Trans
                  i18nKey="gameSettings.vpsebc6d7"
                  components={{
                    details: (
                      <select
                        id="vp-count-setting"
                        value={this.gameSettings.victoryPointsCountNeededToWin}
                        onChange={(e) => this.onVpCountChange(e.target.value)}
                        style={{ marginBottom: "8px" }}
                      >
                        <option key="6" value={6}>
                          6
                        </option>
                        <option key="7" value={7}>
                          7
                        </option>
                        <option key="8" value={8}>
                          8
                        </option>
                        <option key="9" value={9}>
                          9
                        </option>
                        <option key="10" value={10}>
                          10
                        </option>
                        <option key="11" value={11}>
                          11
                        </option>
                        <option key="12" value={12}>
                          12
                        </option>
                        <option key="13" value={13}>
                          13
                        </option>
                        <option key="14" value={14}>
                          14
                        </option>
                        <option key="15" value={15}>
                          15
                        </option>
                      </select>
                    )
                  }}
                />
              </div>
            </OverlayTrigger>
            {this.props.entireGame.gameSettings.playerCount >= 8 && (
              <OverlayTrigger
                overlay={
                  <Tooltip id="lt-count-setting-tooltip">
                    {t(
                      "gameSettings.definesTheNumberOfLoyaltyTokensNeededToWin9b42ca"
                    )}
                  </Tooltip>
                }
              >
                <div>
                  <Trans
                    i18nKey="gameSettings.ltsef35a8"
                    components={{
                      details: (
                        <select
                          id="lt-count-setting"
                          value={this.gameSettings.loyaltyTokenCountNeededToWin}
                          onChange={(e) => this.onLtCountChange(e.target.value)}
                          style={{ marginBottom: "8px" }}
                        >
                          <option key="6" value={6}>
                            6
                          </option>
                          <option key="7" value={7}>
                            7
                          </option>
                          <option key="8" value={8}>
                            8
                          </option>
                          <option key="9" value={9}>
                            9
                          </option>
                          <option key="10" value={10}>
                            10
                          </option>
                          <option key="11" value={11}>
                            11
                          </option>
                          <option key="12" value={12}>
                            12
                          </option>
                          <option key="13" value={13}>
                            13
                          </option>
                          <option key="14" value={14}>
                            14
                          </option>
                          <option key="15" value={15}>
                            15
                          </option>
                        </select>
                      )
                    }}
                  />
                </div>
              </OverlayTrigger>
            )}
          </Col>
          {this.props.entireGame.isFeastForCrows && (
            <Col xs="12">
              <FormCheck
                id="add-port-to-the-eyrie-setting"
                type="switch"
                label={
                  <OverlayTrigger
                    overlay={
                      <Tooltip id="add-port-to-the-eyrie-setting-tooltip">
                        {t(
                          "gameSettings.ifThisOptionIsEnabledTheEyrieHasA9a15c9"
                        )}
                      </Tooltip>
                    }
                  >
                    <label htmlFor="add-port-to-the-eyrie-setting">
                      {t("gameSettings.addAPortToTheEyriefe6468")}
                    </label>
                  </OverlayTrigger>
                }
                checked={this.gameSettings.addPortToTheEyrie}
                onChange={() =>
                  this.changeGameSettings(
                    () =>
                      (this.gameSettings.addPortToTheEyrie =
                        !this.gameSettings.addPortToTheEyrie)
                  )
                }
              />
            </Col>
          )}
          <Col xs="12">
            <FormCheck
              id="adwd-house-cards"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="adwd-house-cards-tooltip">
                      <Trans
                        i18nKey="gameSettings.ifThisOptionIsEnabledTheHouseCardsFrom36ba0c"
                        components={{ bold: <b />, bold2: <b /> }}
                      />
                    </Tooltip>
                  }
                >
                  <label htmlFor="adwd-house-cards">
                    <Trans
                      i18nKey="gameSettings.useAdwdHouseCards09c29a"
                      components={{ emphasis: <i /> }}
                    />
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.adwdHouseCards}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.adwdHouseCards =
                      !this.gameSettings.adwdHouseCards)
                )
              }
            />
          </Col>
          <Col xs="12">
            <FormCheck
              id="asos-house-cards-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="asos-house-cards-setting-tooltip">
                      <Trans
                        i18nKey="gameSettings.ifThisOptionIsEnabledTheHouseCardsFroma220e0"
                        components={{ bold: <b /> }}
                      />
                    </Tooltip>
                  }
                >
                  <label htmlFor="asos-house-cards-setting">
                    <Trans
                      i18nKey="gameSettings.useAsosHouseCardsfc9124"
                      components={{ emphasis: <i /> }}
                    />
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.asosHouseCards}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.asosHouseCards =
                      !this.gameSettings.asosHouseCards)
                )
              }
            />
          </Col>
          <Col xs="12">
            <FormCheck
              id="first-edition-house-cards-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="first-edition-house-cards-setting-tooltip">
                      <Trans
                        i18nKey="gameSettings.ifThisOptionIsEnabledTheHouseCardsFrom2748f0"
                        components={{ bold: <b /> }}
                      />
                    </Tooltip>
                  }
                >
                  <label htmlFor="first-edition-house-cards-setting">
                    <Trans
                      i18nKey="gameSettings.use1stEditionHouseCards4f98d7"
                      components={{ emphasis: <i /> }}
                    />
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.firstEditionHouseCards}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.firstEditionHouseCards =
                      !this.gameSettings.firstEditionHouseCards)
                )
              }
            />
          </Col>
          <Col xs="auto" className="d-flex justify-content-between">
            <FormCheck
              id="decks-evolution-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="decks-evolution-setting-tooltip">
                      <Trans
                        i18nKey="gameSettings.thisIsACommunityVariantThatStartsWithThe4017a7"
                        components={{ bold: <b /> }}
                      />
                    </Tooltip>
                  }
                >
                  <label htmlFor="decks-evolution-setting">
                    {t("gameSettings.houseCardsEvolutionf86001")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.houseCardsEvolution}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.houseCardsEvolution =
                      !this.gameSettings.houseCardsEvolution)
                )
              }
            />
            {this.gameSettings.houseCardsEvolution && (
              <div>
                <span className="ms-1">{t("gameSettings.roundb55b25")}</span>
                <select
                  id="decks-evolution-setting-round"
                  className="ms-2"
                  value={this.gameSettings.houseCardsEvolutionRound}
                  onChange={(e) =>
                    this.onHouseCardsEvolutionRoundChange(e.target.value)
                  }
                  style={{ marginBottom: "8px" }}
                >
                  <option key="2" value={2}>
                    2
                  </option>
                  <option key="3" value={3}>
                    3
                  </option>
                  <option key="4" value={4}>
                    4
                  </option>
                  <option key="5" value={5}>
                    5
                  </option>
                  <option key="6" value={6}>
                    6
                  </option>
                  <option key="7" value={7}>
                    7
                  </option>
                  <option key="8" value={8}>
                    8
                  </option>
                  <option key="9" value={9}>
                    9
                  </option>
                  <option key="10" value={10}>
                    10
                  </option>
                </select>
              </div>
            )}
          </Col>
          {this.props.entireGame.isCustomBalancingOptionAvailable(
            this.gameSettings
          ) && (
            <Col xs="12">
              <FormCheck
                id="custom-balancing-setting"
                type="switch"
                label={
                  <OverlayTrigger
                    overlay={
                      <Tooltip id="custom-balancing-tooltip">
                        {this.props.entireGame.isMotherOfDragons ? (
                          <>
                            <Trans
                              i18nKey="gameSettings.aCommunityProposalToAvoidAnEarlyGangUp2485ff"
                              components={{
                                lineBreak: <br />,
                                actionLink: (
                                  <a
                                    href="https://www.boardgamedungeon.net/threads/my-balance-proposition-for-a-game-of-thrones-mother-of-dragons-expansion-targaryen.11/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  />
                                )
                              }}
                            />
                          </>
                        ) : (
                          <>
                            {t(
                              "gameSettings.aCommunityProposalToImproveTyrellSStartingPositionf8d2a2"
                            )}
                          </>
                        )}
                      </Tooltip>
                    }
                    delay={{ show: 0, hide: 1500 }}
                    placement={isMobile ? "auto" : "bottom"}
                  >
                    <label htmlFor="custom-balancing-setting">
                      {t("gameSettings.customBalancing373a1c")}
                    </label>
                  </OverlayTrigger>
                }
                checked={this.gameSettings.customBalancing}
                onChange={() =>
                  this.changeGameSettings(
                    () =>
                      (this.gameSettings.customBalancing =
                        !this.gameSettings.customBalancing)
                  )
                }
              />
            </Col>
          )}
        </Col>
        <Col xs="6" lg="auto" id="mod-settings-col" className="g-0">
          <Col xs="12">
            <FormCheck
              id="vassals-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="vassals-tooltip">
                      <Trans
                        i18nKey="gameSettings.unassignedHousesWillBeVassalsIntroducedByTheMother979100"
                        components={{ bold: <b /> }}
                      />
                    </Tooltip>
                  }
                >
                  <label htmlFor="vassals-setting">
                    {t("gameSettings.modVassals4a25e2")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.vassals}
              onChange={() =>
                this.changeGameSettings(
                  () => (this.gameSettings.vassals = !this.gameSettings.vassals)
                )
              }
            />
          </Col>
          <Col xs="12">
            <FormCheck
              id="iron-bank-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="iron-bank-setting-tooltip">
                      <Trans
                        i18nKey="gameSettings.enableTheIronBankFromTheMotherOfDragons958c74"
                        components={{
                          bold: <b />,
                          lineBreak: <br />,
                          lineBreak2: <br />,
                          emphasis: <i />
                        }}
                      />
                    </Tooltip>
                  }
                >
                  <label htmlFor="iron-bank-setting">
                    {t("gameSettings.modIronBanka076a5")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.ironBank}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.ironBank = !this.gameSettings.ironBank)
                )
              }
            />
          </Col>
          <Col xs="12">
            <FormCheck
              id="sea-orders-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="sea-orders-tooltip">
                      <Trans
                        i18nKey="gameSettings.enableSeaOrderTokensFromTheMotherOfDragons5b4dda"
                        components={{ bold: <b /> }}
                      />
                    </Tooltip>
                  }
                >
                  <label htmlFor="sea-orders-setting">
                    {t("gameSettings.modSeaOrderTokensbce694")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.seaOrderTokens}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.seaOrderTokens =
                      !this.gameSettings.seaOrderTokens)
                )
              }
            />
          </Col>
          <Col xs="12">
            <FormCheck
              id="gift-power-tokens-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="gift-power-tokens-tooltip">
                      {t(
                        "gameSettings.playersCanFreelyGiftPowerTokensToOtherPlayersd85ba7"
                      )}
                    </Tooltip>
                  }
                >
                  <label htmlFor="gift-power-tokens-setting">
                    {t("gameSettings.modGiftingPowerTokens1d8f63")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.allowGiftingPowerTokens}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.allowGiftingPowerTokens =
                      !this.gameSettings.allowGiftingPowerTokens)
                )
              }
            />
          </Col>
          <Col xs="12">
            <FormCheck
              id="empowered-vassals-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="empowered-vassals-tooltip">
                      {t("gameSettings.empoweredVassalsDescription")}
                    </Tooltip>
                  }
                >
                  <label htmlFor="empowered-vassals-setting">
                    {t("gameSettings.empoweredVassals")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.empoweredVassals}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.empoweredVassals =
                      !this.gameSettings.empoweredVassals)
                )
              }
            />
          </Col>
          <Col xs="12">
            <FormCheck
              id="random-vassal-assignment-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="random-vassal-assignment-tooltip">
                      {t(
                        "gameSettings.vassalsAreRandomlyAssignedToThePlayerHouses38bfca"
                      )}
                    </Tooltip>
                  }
                >
                  <label htmlFor="random-vassal-assignment-setting">
                    {t("gameSettings.randomVassalAssignment766874")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.randomVassalAssignment}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.randomVassalAssignment =
                      !this.gameSettings.randomVassalAssignment)
                )
              }
            />
          </Col>
          <Col xs="12">
            <FormCheck
              id="dragon-war-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="dragon-war-tooltip">
                      <Trans
                        i18nKey="gameSettings.allHousesExceptTargaryenWillReplaceTheirStartingKnight546494"
                        components={{ small: <small />, emphasis: <i /> }}
                      />
                    </Tooltip>
                  }
                >
                  <label htmlFor="dragon-war-setting">
                    {t("common.dragonWar")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.dragonWar}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.dragonWar = !this.gameSettings.dragonWar)
                )
              }
            />
          </Col>
          <Col xs="12">
            <FormCheck
              id="dragon-revenge-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="dragon-revenge-tooltip">
                      {t(
                        "gameSettings.ifAPlayerHasOnlyOneRemainingNonDragonac8813"
                      )}
                    </Tooltip>
                  }
                >
                  <label htmlFor="dragon-revenge-setting">
                    {t("common.dragonRevenge")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.dragonRevenge}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.dragonRevenge =
                      !this.gameSettings.dragonRevenge)
                )
              }
            />
          </Col>
        </Col>
        <Col xs="6" lg="auto" id="extended-base-settings-col" className="g-0">
          <Col xs="12">
            <FormCheck
              id="random-houses-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="random-houses-tooltip">
                      {t(
                        "gameSettings.houseAssignmentsAreCreatedRandomlyef2f7e"
                      )}
                    </Tooltip>
                  }
                >
                  <label htmlFor="random-houses-setting">
                    {t("gameSettings.randomHouses91db93")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.randomHouses}
              onChange={() => this.onRandomHousesChange()}
            />
          </Col>
          <Col xs="12">
            <FormCheck
              id="random-chosen-houses-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="random-chosen-houses-tooltip">
                      {t(
                        "gameSettings.onlyTheSelectedHouseAssignmentsAreRandomlyExchangedThis1a56b0"
                      )}
                    </Tooltip>
                  }
                >
                  <label htmlFor="random-chosen-houses-setting">
                    {t("gameSettings.randomChosenHousesb5b50a")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.randomChosenHouses}
              onChange={() => this.onRandomChosenHousesChange()}
            />
          </Col>
          <Col xs="12">
            <FormCheck
              id="tides-of-battle-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="tides-of-battle-tooltip">
                      {t(
                        "gameSettings.optionalGameModuleThatEnhancesTheRisksAndUncertainty479f1a"
                      )}
                    </Tooltip>
                  }
                >
                  <label htmlFor="tides-of-battle-setting">
                    {t("gameSettings.tidesOfBattle8e22f4")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.tidesOfBattle}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.tidesOfBattle =
                      !this.gameSettings.tidesOfBattle)
                )
              }
            />
          </Col>
          <Col xs="12">
            <FormCheck
              id="remove-tob3-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="remove-tob3-setting-tooltip">
                      {t(
                        "gameSettings.ifThisOptionIsEnabled3sCardsWillBe5b212a"
                      )}
                    </Tooltip>
                  }
                >
                  <label htmlFor="remove-tob3-setting">
                    {t("gameSettings.remove3sCardsFromTob3b6009")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.removeTob3}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.removeTob3 =
                      !this.gameSettings.removeTob3)
                )
              }
            />
          </Col>
          <Col xs="12">
            <FormCheck
              id="remove-tob-skulls-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="remove-tob-skulls-setting-tooltip">
                      {t(
                        "gameSettings.ifThisOptionIsEnabledSkullCardsWillBe2caa2b"
                      )}
                    </Tooltip>
                  }
                >
                  <label htmlFor="remove-tob-skulls-setting">
                    {t("gameSettings.removeSkullsFromTob56ed58")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.removeTobSkulls}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.removeTobSkulls =
                      !this.gameSettings.removeTobSkulls)
                )
              }
            />
          </Col>
          <Col xs="12">
            <FormCheck
              id="limit-tob2-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="limit-tob2-setting-tooltip">
                      {t(
                        "gameSettings.ifThisOptionIsEnabledTheTidesOfBattle40bd50"
                      )}
                    </Tooltip>
                  }
                >
                  <label htmlFor="limit-tob2-setting">
                    {t("gameSettings.limitTob2sCards677193")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.limitTob2}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.limitTob2 = !this.gameSettings.limitTob2)
                )
              }
            />
          </Col>
        </Col>
        <Col xs="6" lg="auto" id="custom-settings-col" className="g-0">
          <Col xs="12">
            <FormCheck
              id="mixed-wd1-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="mixed-wd1-setting-tooltip">
                      <Trans
                        i18nKey="gameSettings.ifThisOptionIsEnabledOneMusteringCardWill5cabaf"
                        components={{
                          bold: <b />,
                          bold2: <b />,
                          bold3: <b />,
                          bold4: <b />,
                          bold5: <b />,
                          bold6: <b />
                        }}
                      />
                    </Tooltip>
                  }
                >
                  <label htmlFor="mixed-wd1-setting">
                    {t("gameSettings.mixedWesterosDeck1084041")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.mixedWesterosDeck1}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.mixedWesterosDeck1 =
                      !this.gameSettings.mixedWesterosDeck1)
                )
              }
            />
          </Col>
          <Col xs="12">
            <FormCheck
              id="westeros-phase-variant-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="westeros-phase-variant-tooltip">
                      {t(
                        "gameSettings.playersMayLookAtTheNext3WesterosCards320840"
                      )}
                    </Tooltip>
                  }
                >
                  <label htmlFor="westeros-phase-variant-setting">
                    {t("gameSettings.cokWesterosPhase671f64")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.cokWesterosPhase}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.cokWesterosPhase =
                      !this.gameSettings.cokWesterosPhase)
                )
              }
            />
          </Col>
          <Col xs="12">
            <FormCheck
              id="endless-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="endless-setting-tooltip">
                      {t(
                        "gameSettings.theNumberOfGameRoundsIsIncreasedTo1000cd40d6"
                      )}
                    </Tooltip>
                  }
                >
                  <label htmlFor="endless-setting">
                    {t("gameSettings.endlessadf7ab")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.endless}
              onChange={() =>
                this.changeGameSettings(
                  () => (this.gameSettings.endless = !this.gameSettings.endless)
                )
              }
            />
          </Col>
          <Col xs="12">
            <FormCheck
              id="faceless-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="faceless-setting-tooltip">
                      {t(
                        "gameSettings.playerNamesWillBeHiddenAndRevealedAfterThe50e6ac"
                      )}
                    </Tooltip>
                  }
                >
                  <label htmlFor="faceless-setting">
                    {t("gameSettings.faceless10470f")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.faceless}
              onChange={() => {
                if (this.gameSettings.faceless) {
                  return;
                }

                if (
                  !window.confirm(
                    t(
                      "gameSettings.enablingFacelessIsPermanentAndCannotBeUndone515372"
                    )
                  )
                ) {
                  return;
                }

                this.changeGameSettings(
                  () =>
                    (this.gameSettings.faceless = !this.gameSettings.faceless)
                );
              }}
            />
          </Col>
          <Col xs="12">
            <FormCheck
              id="fog-of-war-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="fog-of-war-setting-tooltip">
                      {t(
                        "gameSettings.limitVisibilityToControlledRegionsAdjacentRegionsAndRegions98e8be"
                      )}
                    </Tooltip>
                  }
                >
                  <label htmlFor="fog-of-war-setting">
                    {t("gameSettings.fogOfWar7b814e")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.fogOfWar}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.fogOfWar = !this.gameSettings.fogOfWar)
                )
              }
            />
          </Col>
          <Col xs="12">
            <FormCheck
              id="no-private-chats-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="no-private-chats-setting-tooltip">
                      {t(
                        "gameSettings.playersWillNotBeAbleToCreatePrivateChatff7295"
                      )}
                    </Tooltip>
                  }
                >
                  <label htmlFor="no-private-chats-setting">
                    {t("gameSettings.disablePrivateChats079961")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.noPrivateChats}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.noPrivateChats =
                      !this.gameSettings.noPrivateChats)
                )
              }
            />
          </Col>
        </Col>
        <Col xs="6" lg="auto" id="custom-settings-2-col" className="g-0">
          <Col xs="12">
            <FormCheck
              id="preceding-mustering-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="preceding-mustering-tooltip">
                      {t(
                        "gameSettings.allPlayersCanRecruitUnitsLikeDuringAMustering5b2871"
                      )}
                    </Tooltip>
                  }
                >
                  <label htmlFor="preceding-mustering-setting">
                    {t("gameSettings.precedingMustering37bfd9")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.precedingMustering}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.precedingMustering =
                      !this.gameSettings.precedingMustering)
                )
              }
            />
          </Col>
          <Col xs="12">
            <FormCheck
              id="random-start-positions-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="random-start-positions-setting-tooltip">
                      {t(
                        "gameSettings.housesRandomlyChangeTheirStartPositions54de6e"
                      )}
                    </Tooltip>
                  }
                >
                  <label htmlFor="random-start-positions-setting">
                    {t("gameSettings.randomStartPositionsefafe6")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.randomStartPositions}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.randomStartPositions =
                      !this.gameSettings.randomStartPositions)
                )
              }
            />
          </Col>
          <Col xs="12">
            <FormCheck
              id="use-vassal-positions-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="use-vassal-positions-tooltip">
                      {t(
                        "gameSettings.playerHousesWillAlsoStartWithTheirVassalStarting7f9ddd"
                      )}
                    </Tooltip>
                  }
                >
                  <label htmlFor="use-vassal-positions-setting">
                    {t("gameSettings.vassalStartPositions404b33")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.useVassalPositions}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.useVassalPositions =
                      !this.gameSettings.useVassalPositions)
                )
              }
            />
          </Col>
          <Col xs="12">
            <FormCheck
              id="hold-vps-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="hold-vps-setting-tooltip">
                      {t(
                        "gameSettings.whenThisOptionIsEnabledPlayersDoNotWin56e005"
                      )}
                    </Tooltip>
                  }
                >
                  <label htmlFor="hold-vps-setting">
                    {t("gameSettings.holdVictoryPoints216946")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.holdVictoryPointsUntilEndOfRound}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.holdVictoryPointsUntilEndOfRound =
                      !this.gameSettings.holdVictoryPointsUntilEndOfRound)
                )
              }
            />
          </Col>
          <Col xs="12">
            <FormCheck
              id="tournament-mode-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="tournament-mode-tooltip">
                      <Trans
                        i18nKey="gameSettings.thisOptionIsIntendedForTournamentsItDisablesThec3323a"
                        components={{ lineBreak: <br /> }}
                      />
                    </Tooltip>
                  }
                >
                  <label htmlFor="tournament-mode-setting">
                    {t("gameSettings.tournamentMode2cb5db")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.tournamentMode}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.tournamentMode =
                      !this.gameSettings.tournamentMode)
                )
              }
            />
          </Col>
        </Col>
        <Col xs="6" lg="auto" id="draft-settings-col" className="g-0">
          <Col xs="12">
            <FormCheck
              id="draft-house-cards-settings"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="draft-house-cards-tooltip">
                      <Trans
                        i18nKey="gameSettings.playersWillDraftTheirHouseCardsStepByStep47fa57"
                        components={{
                          lineBreak: <br />,
                          bold: <b />,
                          lineBreak2: <br />
                        }}
                      />
                    </Tooltip>
                  }
                >
                  <label htmlFor="draft-house-cards-settings">
                    {t("common.draftHouseCards")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.draftHouseCards}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.draftHouseCards =
                      !this.gameSettings.draftHouseCards)
                )
              }
            />
          </Col>
          <Col xs="12">
            <FormCheck
              id="thematic-draft-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="thematic-draft-tooltip">
                      {t(
                        "gameSettings.playersDraftTheirHouseCardsSimultaneouslyFromTheirHouse1de252"
                      )}
                    </Tooltip>
                  }
                >
                  <label htmlFor="thematic-draft-setting">
                    {t("gameSettings.thematicDraft6e1bc9")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.thematicDraft}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.thematicDraft =
                      !this.gameSettings.thematicDraft)
                )
              }
            />
          </Col>
          <Col xs="12">
            <FormCheck
              id="selected-random-draft-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="selected-random-draft-tooltip">
                      <Trans
                        i18nKey="gameSettings.playersSimultaneouslyDraftTheHouseCardsToBeUsed5a613b"
                        components={{ bold: <b />, bold2: <b /> }}
                      />
                    </Tooltip>
                  }
                >
                  <label htmlFor="selected-random-draft-setting">
                    {t("gameSettings.selectedRandomDrafta0931e")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.selectedRandomDraft}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.selectedRandomDraft =
                      !this.gameSettings.selectedRandomDraft)
                )
              }
            />
          </Col>
          <Col xs="12">
            <FormCheck
              id="random-draft-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="random-draft-tooltip">
                      <Trans
                        i18nKey="gameSettings.playersReceiveRandomHouseCardsAndInfluencePositionsIf40b0ef"
                        components={{ bold: <b />, bold2: <b /> }}
                      />
                    </Tooltip>
                  }
                >
                  <label htmlFor="random-draft-setting">
                    {t("gameSettings.randomDraftdee5dd")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.randomDraft}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.randomDraft =
                      !this.gameSettings.randomDraft)
                )
              }
            />
          </Col>
          <Col xs="12">
            <FormCheck
              id="draft-map-setting"
              type="switch"
              label={
                <OverlayTrigger
                  overlay={
                    <Tooltip id="draft-map-tooltip">
                      <p>
                        <Trans
                          i18nKey="gameSettings.playersCanAdjustStartingPositionsByAddingAndRemoving8b4747"
                          components={{ lineBreak: <br />, small: <small /> }}
                        />
                      </p>
                      <p>
                        <Trans
                          i18nKey="gameSettings.unclaimedTerritoriesAreDistributedFairlyAmongHousesAllPlayers61978c"
                          components={{
                            details: (
                              <ul>
                                <li>
                                  {t(
                                    "gameSettings.territoriesWithOneNeighboringHouseAreAssignedToThat4b281f"
                                  )}
                                </li>
                                <li>
                                  {t(
                                    "gameSettings.territoriesWithMultipleNeighborsRemainUnassigned836f98"
                                  )}
                                </li>
                              </ul>
                            )
                          }}
                        />
                      </p>
                    </Tooltip>
                  }
                >
                  <label htmlFor="draft-map-setting">
                    {t("gameSettings.draftScenarioca4e5c")}
                  </label>
                </OverlayTrigger>
              }
              checked={this.gameSettings.draftMap}
              onChange={() =>
                this.changeGameSettings(
                  () =>
                    (this.gameSettings.draftMap = !this.gameSettings.draftMap)
                )
              }
            />
          </Col>
        </Col>
        {this.gameSettings.draftHouseCards && (
          <Col xs="6" lg="auto" id="draft-decks-settings-col" className="g-0">
            <Col xs="12">
              <FormCheck
                id="draft-tracks-settings"
                type="switch"
                label={
                  <OverlayTrigger
                    overlay={
                      <Tooltip id="draft-tracks-tooltip">
                        <Trans
                          i18nKey="gameSettings.ifThisOptionIsEnabledPlayersCanChooseTo566c1d"
                          components={{
                            lineBreak: <br />,
                            bold: <b />,
                            bold2: <b />
                          }}
                        />
                      </Tooltip>
                    }
                  >
                    <label htmlFor="draft-tracks-settings">
                      {t("gameSettings.draftInfluenceTracks1e1ad8")}
                    </label>
                  </OverlayTrigger>
                }
                checked={this.gameSettings.draftTracks}
                onChange={() =>
                  this.changeGameSettings(
                    () =>
                      (this.gameSettings.draftTracks =
                        !this.gameSettings.draftTracks)
                  )
                }
              />
            </Col>
            <Col xs="12">
              <FormCheck
                id="limited-draft-setting"
                type="switch"
                label={
                  <OverlayTrigger
                    overlay={
                      <Tooltip id="limited-draft-tooltip">
                        {t(
                          "gameSettings.thisOptionRemovesHouseCardDecksFromHousesThat1d7712"
                        )}
                      </Tooltip>
                    }
                  >
                    <label htmlFor="limited-draft-setting">
                      {t("gameSettings.limitedDrafte5056c")}
                    </label>
                  </OverlayTrigger>
                }
                checked={this.gameSettings.limitedDraft}
                onChange={() =>
                  this.changeGameSettings(
                    () =>
                      (this.gameSettings.limitedDraft =
                        !this.gameSettings.limitedDraft)
                  )
                }
              />
            </Col>
            {this.gameSettings.randomDraft && (
              <>
                <Col xs="12">
                  <FormCheck
                    id="blind-draft-setting"
                    type="switch"
                    label={
                      <OverlayTrigger
                        overlay={
                          <Tooltip id="blind-draft-tooltip">
                            <Trans
                              i18nKey="gameSettings.playersReceiveRandomHouseCardsAndInfluencePositionsIf7019a6"
                              components={{ bold: <b />, bold2: <b /> }}
                            />
                          </Tooltip>
                        }
                      >
                        <label htmlFor="blind-draft-setting">
                          {t("gameSettings.blindDraft9b1f43")}
                        </label>
                      </OverlayTrigger>
                    }
                    checked={this.gameSettings.blindDraft}
                    onChange={() =>
                      this.changeGameSettings(
                        () =>
                          (this.gameSettings.blindDraft =
                            !this.gameSettings.blindDraft)
                      )
                    }
                  />
                </Col>
                <Col xs="12">
                  <FormCheck
                    id="perpetuum-draft-setting"
                    type="switch"
                    label={
                      <OverlayTrigger
                        overlay={
                          <Tooltip id="perpetuum-draft-tooltip">
                            {t(
                              "gameSettings.playersReceiveANewDeckEachTimeAfterThed9b84a"
                            )}
                          </Tooltip>
                        }
                      >
                        <label htmlFor="perpetuum-draft-setting">
                          Perpetuum Random
                        </label>
                      </OverlayTrigger>
                    }
                    checked={this.gameSettings.perpetuumRandom}
                    onChange={() =>
                      this.changeGameSettings(
                        () =>
                          (this.gameSettings.perpetuumRandom =
                            !this.gameSettings.perpetuumRandom)
                      )
                    }
                  />
                </Col>
              </>
            )}
            <Col xs="12">
              <FormCheck
                id="base-deck-setting"
                type="checkbox"
                label={
                  <OverlayTrigger
                    overlay={
                      <Tooltip id="base-deck-setting-tooltip">
                        <Trans
                          i18nKey="gameSettings.thisOptionAddsThe2ndEditionBaseGameDecks0d72c2"
                          components={{
                            bold: <b />,
                            bold2: <b />,
                            bold3: <b />,
                            bold4: <b />
                          }}
                        />
                      </Tooltip>
                    }
                  >
                    <label htmlFor="base-deck-setting">
                      {t("gameSettings.2ndEdBaseAndModA2f96ac")}
                    </label>
                  </OverlayTrigger>
                }
                checked={
                  (this.gameSettings.selectedDraftDecks &
                    HouseCardDecks.BaseAndModA) ==
                  HouseCardDecks.BaseAndModA
                }
                onChange={(e) =>
                  this.selectHouseCardDeck(e, HouseCardDecks.BaseAndModA)
                }
              />
            </Col>
            <Col xs="12">
              <FormCheck
                id="alternative-deck-setting"
                type="checkbox"
                label={
                  <OverlayTrigger
                    overlay={
                      <Tooltip id="alternative-deck-setting-tooltip">
                        <Trans
                          i18nKey="gameSettings.thisOptionAddsTheDecksFromTheDanceWitha2c839"
                          components={{
                            bold: <b />,
                            bold2: <b />,
                            bold3: <b />,
                            bold4: <b />,
                            bold5: <b />
                          }}
                        />
                      </Tooltip>
                    }
                  >
                    <label htmlFor="alternative-deck-setting">
                      {t("gameSettings.dwdFfcAndModB4b39f6")}
                    </label>
                  </OverlayTrigger>
                }
                checked={
                  (this.gameSettings.selectedDraftDecks &
                    HouseCardDecks.DwdFfcModB) ==
                  HouseCardDecks.DwdFfcModB
                }
                onChange={(e) =>
                  this.selectHouseCardDeck(e, HouseCardDecks.DwdFfcModB)
                }
              />
            </Col>
            <Col xs="12">
              <FormCheck
                id="sos-deck-setting"
                type="checkbox"
                label={
                  <OverlayTrigger
                    overlay={
                      <Tooltip id="sos-deck-setting-tooltip">
                        <Trans
                          i18nKey="gameSettings.thisOptionAddsTheDecksFromTheStormOfecdf54"
                          components={{
                            bold: <b />,
                            bold2: <b />,
                            bold3: <b />,
                            bold4: <b />
                          }}
                        />
                      </Tooltip>
                    }
                  >
                    <label htmlFor="sos-deck-setting">
                      {t("gameSettings.sosAndModA2de134")}
                    </label>
                  </OverlayTrigger>
                }
                checked={
                  (this.gameSettings.selectedDraftDecks &
                    HouseCardDecks.StormOfSwords) ==
                  HouseCardDecks.StormOfSwords
                }
                onChange={(e) =>
                  this.selectHouseCardDeck(e, HouseCardDecks.StormOfSwords)
                }
              />
            </Col>
            <Col xs="12">
              <FormCheck
                id="first-edition-deck-setting"
                type="checkbox"
                label={
                  <OverlayTrigger
                    overlay={
                      <Tooltip id="first-edition-deck-setting-tooltip">
                        <Trans
                          i18nKey="gameSettings.thisOptionAddsTheDecksFromThe1stEditione59ff2"
                          components={{ bold: <b /> }}
                        />
                      </Tooltip>
                    }
                  >
                    <label htmlFor="first-edition-deck-setting">
                      {t("gameSettings.1stEditiona6f26b")}
                    </label>
                  </OverlayTrigger>
                }
                checked={
                  (this.gameSettings.selectedDraftDecks &
                    HouseCardDecks.FirstEdition) ==
                  HouseCardDecks.FirstEdition
                }
                onChange={(e) =>
                  this.selectHouseCardDeck(e, HouseCardDecks.FirstEdition)
                }
              />
            </Col>
          </Col>
        )}
      </Row>
    );
  }

  createSetupItems(): ReactNode {
    const items: React.JSX.Element[] = [];

    allGameSetups.forEach((setupData, setupId) => {
      items.push(
        <option key={setupId} value={setupId}>
          {setupData.name}
        </option>
      );
    });

    return items;
  }

  createPlayerCountItems(): ReactNode {
    const items: React.JSX.Element[] = [];

    const playerSetups = getGameSetupContainer(
      this.gameSettings.setupId
    ).playerSetups;

    playerSetups.forEach((gameSetup) => {
      items.push(
        <option key={gameSetup.playerCount} value={gameSetup.playerCount}>
          {gameSetup.playerCount}
        </option>
      );
    });

    return items;
  }

  onSetupChange(newVal: string): void {
    if (!this.canChangeGameSettings) {
      return;
    }

    this.gameSettings.setupId = newVal;

    // On setup change set player count to it's default value which should be the highest value (last element)
    const container = getGameSetupContainer(newVal);
    const playerCounts = container.playerSetups.map(
      (playerSetup) => playerSetup.playerCount
    );
    const defaultPlayerCount = playerCounts[playerCounts.length - 1];
    this.gameSettings.playerCount = defaultPlayerCount;

    this.changeGameSettings();
  }

  onPlayerCountChange(newVal: string): void {
    if (!this.canChangeGameSettings) {
      return;
    }

    this.gameSettings.playerCount = parseInt(newVal);

    this.changeGameSettings();
  }

  onInitialLiveClockChange(newVal: string): void {
    if (!this.canChangeGameSettings) {
      return;
    }

    this.gameSettings.initialLiveClock = parseInt(newVal);

    this.changeGameSettings();
  }

  onVpCountChange(newVal: string): void {
    if (!this.canChangeGameSettings) {
      return;
    }

    this.gameSettings.victoryPointsCountNeededToWin = parseInt(newVal);

    this.changeGameSettings();
  }

  onLtCountChange(newVal: string): void {
    if (!this.canChangeGameSettings) {
      return;
    }

    this.gameSettings.loyaltyTokenCountNeededToWin = parseInt(newVal);

    this.changeGameSettings();
  }

  onHouseCardsEvolutionRoundChange(newVal: string): void {
    if (!this.canChangeGameSettings) {
      return;
    }

    if (!this.gameSettings.houseCardsEvolution) {
      return;
    }

    this.gameSettings.houseCardsEvolutionRound = parseInt(newVal);

    this.changeGameSettings();
  }

  onRandomChosenHousesChange(): void {
    if (
      !this.entireGame.gameSettings.randomChosenHouses &&
      this.entireGame.gameSettings.randomHouses
    ) {
      return;
    }

    this.changeGameSettings(
      () =>
        (this.entireGame.gameSettings.randomChosenHouses =
          !this.entireGame.gameSettings.randomChosenHouses)
    );
  }

  onRandomHousesChange(): void {
    if (
      !this.entireGame.gameSettings.randomHouses &&
      this.entireGame.gameSettings.randomChosenHouses
    ) {
      return;
    }

    this.changeGameSettings(
      () =>
        (this.entireGame.gameSettings.randomHouses =
          !this.entireGame.gameSettings.randomHouses)
    );
  }

  /**
   * Helper function to modify gameSettings and update the game settings.
   * @param action Function that modifies gameSettings
   */
  changeGameSettings(action: () => void = () => {}): void {
    if (!this.canChangeGameSettings) {
      return;
    }

    action();

    this.props.entireGame.updateGameSettings(this.gameSettings);
  }

  selectHouseCardDeck(
    e: React.ChangeEvent<HTMLInputElement>,
    deck: HouseCardDecks
  ): void {
    if (e.target.checked) {
      this.gameSettings.selectedDraftDecks |= deck;
    } else {
      this.gameSettings.selectedDraftDecks &= ~deck;
    }
    this.changeGameSettings();
  }
}
