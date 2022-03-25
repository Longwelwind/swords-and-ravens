import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import * as React from "react";
import { Card, Col, OverlayTrigger, Row, Tooltip } from "react-bootstrap";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import IronBank from "../common/ingame-game-state/game-data-structure/IronBank";
import HouseNumberResultsComponent from "./HouseNumberResultsComponent";
import House from "../common/ingame-game-state/game-data-structure/House";
import preventOverflow from "@popperjs/core/lib/modifiers/preventOverflow";
import braavosInitialLoanCostReduceImage from "../../public/images/garrisons/braavos-initial-loan-cost-reduce.png"
import ironBankImage from "../../public/images/ironBank.jpg"
import { OverlayChildren } from "react-bootstrap/esm/Overlay";

interface IronBankInfosComponentProps {
    ingame: IngameGameState;
    ironBank: IronBank;
}

@observer
export default class IronBankInfosComponent extends Component<IronBankInfosComponentProps> {
    get isEssosMapUsed(): boolean {
        return this.props.ingame.entireGame.gameSettings.playerCount == 8;
    }

    render(): ReactNode {
        const braavosController = this.props.ironBank.controllerOfBraavos;
        const interestCosts = this.props.ingame.game.houses.values.map(h => [h, this.props.ironBank.purchasedLoans.filter(lc => lc.purchasedBy == h).length] as [House, number]).filter(([_h, costs]) => costs > 0);
        const backgroundOpacity = braavosController || interestCosts.length > 0 ? 0.5 : 1;
        return (
            <>
                <Card style={{ height: "100%" }} className="hover-smedium-outline">
                    <Card.Img variant="top" src={ironBankImage} style={{opacity: backgroundOpacity, height: "100%", width: "auto"}}/>
                    <Card.ImgOverlay style={{ padding: 16, paddingBottom: 8 }} className="clickable-no-underline">
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
                            <HouseNumberResultsComponent results={interestCosts} keyPrefix="iron-bank-interests-costs" bold={true} />
                        </Col>
                    </Row>}
            </Col>
        </Row>;
    }

    renderIronBankTooltip(): OverlayChildren {
        return <Tooltip id="iron-bank-tooltip" className="tooltip-w-100">
            <Col>
                <h4 className="text-center">The Iron Bank of Braavos</h4>
                Nestled in a seemingly impenetrable northern bay, the free city of Braavos lays claim to<br/>
                one of the most powerful institutions in the Known World: the Iron Bank of Braavos.<br/><br/>
                <h5>Purchasing Loans</h5>
                The Iron Bank provides a service to the lords of Westeros by offering them favorable bank loans.<br/>
                Each loan allows the lord to purchase useful aides for their cause.<br/>
                When resolving the special Iron Bank sea order, a player may take one loan.<br/><br/>
                To take a loan, a player follows these steps:<br/>
                <ol className="mb-0 mt-1">
                    <li>The player chooses a faceup loan from one of the three slots of the Iron Bank.</li>
                    <li>The player pays the loan&apos;s <b>initial cost</b> by discarding a number of available<br/>
                    Power tokens equal to the value shown {this.isEssosMapUsed ? "above" : "below"} that loan card&apos; current slot.</li>
                    <li>The player resolves the effect of their chosen loan.<br/>
                    <i>(Click on the loan deck to explore all the loan effects)</i></li>
                </ol>
                <br/>
                <h5>Paying Interest</h5>
                The shrewd money-lenders of the great institution of The Iron Bank do not easily forgive debt.<br/>
                After purchasing a loan, a house must pay an interest cost to the Iron Bank for the remainder of the game.<br/>
                At the beginning of the Westeros Phase, in turn order, each player with a loan must discard<br/>
                one of their available Power tokens for each loan they have purchased.<br/>
                If that player is not able to discard the requisite  number of power, for each power they are short,<br/>
                the player who holds the Valyrian Steel Blade chooses one of that player&apos;s units anywhere and destroys it.<br/>
                If the player who cannot pay their interest is the holder of the Blade, the next highest player on that track<br/>
                makes this choice.<br/><br/>
                {this.isEssosMapUsed &&
                <>
                    <h5>Controlling Braavos</h5>
                    Though no easy task, it is possible to gain the upper hand in negotiating with the Iron Bank<br/>
                    by controlling the city it resides in. The first player to defeat the 5-strength neutral force token<br/>
                    on Braavos places that token facedown in front of them. While a player has this token,<br/>
                    that token acts as a reminder that the player receives a <b>–1</b> to the <b>initial cost</b> of the loan<br/>
                    (but not the interest).<br/>
                    If another player takes control of Braavos they immediately receive the Braavos neutral force token.
                </>}
            </Col>
        </Tooltip>;
    }
}