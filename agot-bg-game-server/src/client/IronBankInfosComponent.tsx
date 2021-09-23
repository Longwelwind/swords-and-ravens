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
        const interestCosts = this.props.ingame.game.houses.values.map(h => [h, this.props.ironBank.purchasedLoans.filter(lc => lc.purchasedBy == h).length] as [House, number]);
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
                                <Row className="justify-content-center">
                                    <OverlayTrigger overlay={
                                        <Tooltip id="interests-costs-tooltip">At the beginning of the Westeros Phase, in turn order, each player with a loan must discard one of their available power tokens for each loan they have purchased.
                                            If that player is not able to discard the requisite number of power, for each power they are short, the player who holds the Valyrian Steel Blade chooses one of that player’s units anywhere and destroys it.
                                            If the player who cannot pay their interest is the holder of the Blade, the next highest player on that track makes this choice.
                                        </Tooltip>}
                                        placement="auto"
                                        popperConfig={{ modifiers: [preventOverflow] }}
                                    >
                                        <h5 className="text-center">Interest costs</h5>
                                    </OverlayTrigger>
                                    <HouseNumberResultsComponent results={interestCosts} />
                                </Row>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            </>
        );
    }
}