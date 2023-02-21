import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import * as React from "react";
import { Card, Col, OverlayTrigger, Row, Tooltip } from "react-bootstrap";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import { IronBankSnapshot } from "../common/ingame-game-state/game-data-structure/IronBank";
import HouseNumberResultsComponent from "./HouseNumberResultsComponent";
import House from "../common/ingame-game-state/game-data-structure/House";
import preventOverflow from "@popperjs/core/lib/modifiers/preventOverflow";
import braavosInitialLoanCostReduceImage from "../../public/images/garrisons/braavos-initial-loan-cost-reduce.png"
import ironBankImage from "../../public/images/ironBank.jpg"

interface IronBankSnapshotComponentProps {
    ingame: IngameGameState;
    ironBank: IronBankSnapshot;
}

@observer
export default class IronBankSnapshotComponent extends Component<IronBankSnapshotComponentProps> {
    get isEssosMapUsed(): boolean {
        return this.props.ingame.entireGame.gameSettings.playerCount >= 8;
    }

    get ingame(): IngameGameState {
        return this.props.ingame;
    }

    get ironBank(): IronBankSnapshot {
        return this.props.ironBank;
    }

    render(): ReactNode {
        const braavosController = this.ironBank.braavosController ? this.ingame.game.houses.get(this.ironBank.braavosController) : null;
        const interestCosts = this.ironBank.interestCosts ? this.ironBank.interestCosts.map(([hid, cost]) => [this.ingame.game.houses.get(hid), cost] as [House, number]) : [];
        const backgroundOpacity = braavosController || interestCosts.length > 0 ? 0.7 : 1;
        return (
            <>
                <Card style={{ height: "100%" }}>
                    <Card.Img variant="top" src={ironBankImage} style={{opacity: backgroundOpacity, height: "100%", width: "auto"}}/>
                    <Card.ImgOverlay style={{ padding: 16, paddingBottom: 8 }}>
                        {this.renderIronBankInfos(braavosController, interestCosts)}
                    </Card.ImgOverlay>
                </Card>
            </>
        );
    }

    renderIronBankInfos(braavosController: House | null, interestCosts: [House, number][]): JSX.Element {
        return <Row style={{ height: "100%" }} className="align-items-center">
            <Col xs={12}>
                {braavosController &&
                    <Row className="justify-content-center" style={{ marginBottom: 16 }}>
                        <OverlayTrigger
                            placement="auto"
                            overlay={<Tooltip id="braavos-controller-tooltip">The controller of Braavos receives a <b>-1</b> to the <b>initial cost</b> of the loan.</Tooltip>}
                            popperConfig={{ modifiers: [preventOverflow] }}>
                            <Row className="align-items-center justify-content-cener">
                                <Col xs="auto" className="p-1">
                                    <img src={braavosInitialLoanCostReduceImage} width={120} />
                                </Col>
                                <Col className="p-1">
                                    <h5 style={{ display: "inline" }}><b style={{marginLeft: "5px"}}>{braavosController.name}</b></h5>
                                </Col>
                            </Row>
                        </OverlayTrigger>
                    </Row>}
                {interestCosts.length > 0 &&
                    <Row className="justify-content-center">
                        <OverlayTrigger overlay={<Tooltip id="interests-costs-tooltip" className="tooltip-w-100">
                            <Col>
                                At the beginning of the Westeros Phase, any player having received loans<br/>
                                must pay one Power token per loan as interest, resolving in turn order.<br/>
                                For every token the player cannot pay, the Valyrian Steel Blade holder<br/>
                                destroys one of that player&apos;s units anywhere on the map.<br/>
                                If the player holds the Valyrian Steel Blade, the next highest player<br/>
                                on the Fiefdoms track will make this choice instead.
                            </Col>
                        </Tooltip>}
                            placement="auto"
                            popperConfig={{ modifiers: [preventOverflow] }}
                        >
                            <Col xs={12} className="py-1">
                                <h5 className="text-center">Interest per round</h5>
                            </Col>
                        </OverlayTrigger>
                        <Col xs="auto" className="py-0">
                            <HouseNumberResultsComponent results={interestCosts} keyPrefix="iron-bank-interests-costs" bold makeGreyjoyBlack />
                        </Col>
                    </Row>}
            </Col>
        </Row>;
    }
}