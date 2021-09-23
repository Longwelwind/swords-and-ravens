import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import * as React from "react";
import { Card, Col, OverlayTrigger, Row, Tooltip } from "react-bootstrap";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import IronBank from "../common/ingame-game-state/game-data-structure/IronBank";
import HouseNumberResultsComponent from "./HouseNumberResultsComponent";
import House from "../common/ingame-game-state/game-data-structure/House";
import preventOverflow from "@popperjs/core/lib/modifiers/preventOverflow";
import braavosInitialLoanCostReduce from "../../public/images/garrisons/braavos-initial-loan-cost-reduce.png"

interface IronBankInfosComponentProps {
    ingame: IngameGameState;
    ironBank: IronBank;
}

@observer
export default class IronBankInfosComponent extends Component<IronBankInfosComponentProps> {
    render(): ReactNode {
        const braavosController = this.props.ironBank.controllerOfBraavos;
        const interestCosts = this.props.ingame.game.houses.values.map(h => [h, this.props.ironBank.purchasedLoans.filter(lc => lc.purchasedBy == h).length] as [House, number]).filter(([_h, costs]) => costs > 0);
        return (
            <>
                <Card style={{ height: "100%" }}>
                    <Card.Body style={{ padding: 16, paddingBottom: 8 }}>
                        <Row style={{height: "100%"}} className="align-items-center">
                            <Col xs={12}>
                                {braavosController &&
                                    <Row className="justify-content-center" style={{marginBottom: 16}}>
                                        <OverlayTrigger
                                            placement="auto"
                                            overlay={<Tooltip id="braavos-controller-tooltip">The controller of Braavos receives -1 to the initial cost of the loan.</Tooltip>}
                                            popperConfig={{ modifiers: [preventOverflow] }}>
                                            <Row className="align-items-center justify-content-cener">
                                                <Col xs="auto" className="p-1">
                                                    <img src={braavosInitialLoanCostReduce} width={120} />
                                                </Col>
                                                <Col className="p-1">
                                                    <h5 style={{ display: "inline", color: braavosController.color }}><b>&nbsp;{braavosController.name}</b></h5>
                                                </Col>
                                            </Row>
                                        </OverlayTrigger>
                                    </Row>}
                                {interestCosts.length > 0 &&
                                    <Row className="justify-content-center">
                                        <OverlayTrigger overlay={
                                            <Tooltip id="interests-costs-tooltip">At the beginning of the Westeros Phase, any player having received loans must pay one power token
                                            per loan as interest, resolving in turn order.<br/>For every token the player cannot pay, the Valyrian Steel Blade holder destroys
                                            one of that player&apos;s units anywhere on the map. If the player holds the Valyrian Steel Blade, the next highest player on the Fiefdoms track
                                            will make this choice instead.
                                            </Tooltip>}
                                            placement="auto"
                                            popperConfig={{ modifiers: [preventOverflow] }}
                                        >
                                            <Col xs={12} className="py-0">
                                                <h5 className="text-center">Interest per round</h5>
                                            </Col>
                                        </OverlayTrigger>
                                        <Col xs="auto" className="py-0">
                                            <HouseNumberResultsComponent results={interestCosts} />
                                        </Col>
                                    </Row>}
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            </>
        );
    }
}