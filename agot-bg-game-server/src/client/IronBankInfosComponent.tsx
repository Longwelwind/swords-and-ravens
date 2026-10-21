import { t, Trans } from "./i18n";
import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import * as React from "react";
import { Card, Col, OverlayTrigger, Row, Tooltip } from "react-bootstrap";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import IronBank from "../common/ingame-game-state/game-data-structure/IronBank";
import HouseNumberResultsComponent from "./HouseNumberResultsComponent";
import House from "../common/ingame-game-state/game-data-structure/House";
import preventOverflow from "@popperjs/core/lib/modifiers/preventOverflow";
import braavosInitialLoanCostReduceImage from "../../public/images/garrisons/braavos-initial-loan-cost-reduce.png";
import ironBankImage from "../../public/images/ironBank.jpg";
import { OverlayChildren } from "react-bootstrap/Overlay";

interface IronBankInfosComponentProps {
  ingame: IngameGameState;
  ironBank: IronBank;
}

@observer
export default class IronBankInfosComponent extends Component<IronBankInfosComponentProps> {
  get isEssosMapUsed(): boolean {
    return this.props.ingame.entireGame.gameSettings.playerCount >= 8;
  }

  render(): ReactNode {
    const braavosController = this.props.ironBank.controllerOfBraavos;
    const interestCosts = this.props.ironBank.interestCostPerHouse;
    const backgroundOpacity =
      braavosController || interestCosts.length > 0 ? 0.7 : 1;
    return (
      <>
        <Card style={{ height: "100%" }} className="hover-weak-outline">
          <Card.Img
            variant="top"
            src={ironBankImage}
            style={{
              opacity: backgroundOpacity,
              height: "100%",
              width: "auto"
            }}
          />
          <Card.ImgOverlay
            style={{ padding: 16, paddingBottom: 8 }}
            className="clickable-no-underline"
          >
            <OverlayTrigger
              overlay={this.renderIronBankTooltip()}
              placement="auto"
              popperConfig={{ modifiers: [preventOverflow] }}
              trigger="click"
              rootClose
            >
              {this.renderIronBankInfos(braavosController, interestCosts)}
            </OverlayTrigger>
          </Card.ImgOverlay>
        </Card>
      </>
    );
  }

  renderIronBankInfos(
    braavosController: House | null,
    interestCosts: [House, number][]
  ): React.JSX.Element {
    return (
      <Row style={{ height: "100%" }} className="align-items-center">
        <Col xs={12}>
          {braavosController && (
            <Row
              className="justify-content-center"
              style={{ marginBottom: 16 }}
            >
              <OverlayTrigger
                placement="auto"
                overlay={
                  <Tooltip id="braavos-controller-tooltip">
                    <Trans
                      i18nKey="ironBankInfos.theControllerOfBraavosReceivesA1ToThe1dea8a"
                      components={{ element0: <b />, element1: <b /> }}
                    />
                  </Tooltip>
                }
                popperConfig={{ modifiers: [preventOverflow] }}
              >
                <Row className="align-items-center justify-content-cener">
                  <Col xs="auto" className="p-1">
                    <img src={braavosInitialLoanCostReduceImage} width={120} />
                  </Col>
                  <Col className="p-1">
                    <h5 style={{ display: "inline" }}>
                      <b style={{ marginLeft: "5px" }}>
                        {braavosController.name}
                      </b>
                    </h5>
                  </Col>
                </Row>
              </OverlayTrigger>
            </Row>
          )}
          {interestCosts.length > 0 && (
            <Row className="justify-content-center">
              <OverlayTrigger
                overlay={
                  <Tooltip
                    id="interests-costs-tooltip"
                    className="tooltip-w-100"
                  >
                    <Trans
                      i18nKey="ironBankInfos.atTheBeginningOfTheWesterosPhaseAnyPlayer34f1e3"
                      components={{
                        element0: <br />,
                        element1: <br />,
                        element2: <br />,
                        element3: <br />,
                        element4: <br />
                      }}
                    />
                  </Tooltip>
                }
                placement="auto"
                popperConfig={{ modifiers: [preventOverflow] }}
              >
                <Col xs={12} className="py-1">
                  <h5 className="text-center">
                    {t("ironBankInfos.interestPerRound0ec415")}
                  </h5>
                </Col>
              </OverlayTrigger>
              <Col xs="auto" className="py-0">
                <HouseNumberResultsComponent
                  results={interestCosts}
                  keyPrefix="iron-bank-interests-costs"
                  bold
                  makeGreyjoyBlack
                />
              </Col>
            </Row>
          )}
        </Col>
      </Row>
    );
  }

  renderIronBankTooltip(): OverlayChildren {
    return (
      <Tooltip id="iron-bank-tooltip" className="scrollable-tooltip">
        <Row>
          <Col className="p-2 m-2">
            <Trans
              i18nKey="ironBankInfos.nestledInASeeminglyImpenetrableNorthernBayTheFree7573dd"
              components={{
                element0: (
                  <h4 className="text-center">
                    {t("ironBankInfos.theIronBankOfBraavos47e011")}
                  </h4>
                ),
                element1: <br />,
                element2: <br />,
                element3: <br />,
                element4: <h5>{t("ironBankInfos.purchasingLoans9325fa")}</h5>,
                element5: <br />,
                element6: <br />,
                element7: <i />,
                element8: <br />,
                element9: <br />,
                element10: <i />,
                element11: <br />,
                element12: <br />,
                element13: <br />,
                element14: <br />,
                element15: (
                  <ol className="mb-0 mt-1">
                    <li>
                      {t(
                        "ironBankInfos.thePlayerChoosesAFaceupLoanFromOneOf4e6754"
                      )}
                    </li>
                    <li>
                      <Trans
                        i18nKey="ironBankInfos.thePlayerPaysTheLoanSInitialCostBy2bde6e"
                        components={{
                          element0: <b />,
                          element1: <br />,
                          value2: (
                            <>
                              {this.isEssosMapUsed
                                ? t("ironBankInfos.above88c7f0")
                                : t("ironBankInfos.below8ada24")}
                            </>
                          )
                        }}
                      />
                    </li>
                    <li>
                      <Trans
                        i18nKey="ironBankInfos.thePlayerResolvesTheEffectOfTheirChosenLoan8ca811"
                        components={{ element0: <br />, element1: <i /> }}
                      />
                    </li>
                  </ol>
                ),
                element16: <br />,
                element17: <h5>{t("ironBankInfos.payingInterestd21db4")}</h5>,
                element18: <br />,
                element19: <br />,
                element20: <br />,
                element21: <br />,
                element22: <br />,
                element23: <br />,
                element24: <br />,
                element25: <br />,
                value26: (
                  <>
                    {this.isEssosMapUsed && (
                      <>
                        <Trans
                          i18nKey="ironBankInfos.thoughNoEasyTaskItIsPossibleToGain17b043"
                          components={{
                            element0: <br />,
                            element1: (
                              <h5>
                                {t("ironBankInfos.controllingBraavosd7b7ff")}
                              </h5>
                            ),
                            element2: <br />,
                            element3: <br />,
                            element4: <br />,
                            element5: <b />,
                            element6: <b />,
                            element7: <br />,
                            element8: <br />
                          }}
                        />
                      </>
                    )}
                  </>
                )
              }}
            />
          </Col>
        </Row>
      </Tooltip>
    );
  }
}
