import { t, Trans } from "./i18n";
import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import * as React from "react";
import { Card, Col, OverlayTrigger, Row, Tooltip } from "react-bootstrap";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import HouseNumberResultsComponent from "./HouseNumberResultsComponent";
import House from "../common/ingame-game-state/game-data-structure/House";
import preventOverflow from "@popperjs/core/lib/modifiers/preventOverflow";
import braavosInitialLoanCostReduceImage from "../../public/images/garrisons/braavos-initial-loan-cost-reduce.png";
import ironBankImage from "../../public/images/ironBank.jpg";
import IIronBankSnapshot from "./game-replay/IronBankSnapshot";

interface IronBankSnapshotComponentProps {
  ingame: IngameGameState;
  ironBank: IIronBankSnapshot;
}

@observer
export default class IronBankSnapshotComponent extends Component<IronBankSnapshotComponentProps> {
  get isEssosMapUsed(): boolean {
    return this.props.ingame.entireGame.gameSettings.playerCount >= 8;
  }

  get ingame(): IngameGameState {
    return this.props.ingame;
  }

  get ironBank(): IIronBankSnapshot {
    return this.props.ironBank;
  }

  render(): ReactNode {
    const braavosController = this.ironBank.braavosController
      ? this.ingame.game.houses.get(this.ironBank.braavosController)
      : null;
    const interestCosts = this.ironBank.interestCosts
      ? this.ironBank.interestCosts.map(
          ([hid, cost]) =>
            [this.ingame.game.houses.get(hid), cost] as [House, number]
        )
      : [];
    const backgroundOpacity =
      braavosController || interestCosts.length > 0 ? 0.7 : 1;
    return (
      <>
        <Card style={{ height: "100%" }}>
          <Card.Img
            variant="top"
            src={ironBankImage}
            style={{
              opacity: backgroundOpacity,
              height: "100%",
              width: "auto"
            }}
          />
          <Card.ImgOverlay style={{ padding: 16, paddingBottom: 8 }}>
            {this.renderIronBankInfos(braavosController, interestCosts)}
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
                      components={{ bold: <b />, bold2: <b /> }}
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
                    <Col>
                      <Trans
                        i18nKey="ironBankInfos.atTheBeginningOfTheWesterosPhaseAnyPlayer34f1e3"
                        components={{
                          lineBreak: <br />,
                          lineBreak2: <br />,
                          lineBreak3: <br />,
                          lineBreak4: <br />,
                          lineBreak5: <br />
                        }}
                      />
                    </Col>
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
}
