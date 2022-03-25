import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import * as React from "react";
import { Badge, Col, OverlayTrigger, Row } from "react-bootstrap";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import IronBank from "../common/ingame-game-state/game-data-structure/IronBank";
import IronBankInfosComponent from "./IronBankInfosComponent";
import loanCardImages from "./loanCardImages";
import ImagePopover from "./utils/ImagePopover";
import { preventOverflow } from "@popperjs/core";
import renderLoanCardsToolTip from "./loanCardsTooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretLeft } from "@fortawesome/free-solid-svg-icons";

interface IronBankTabComponentProps {
    ingame: IngameGameState;
    ironBank: IronBank;
}

@observer
export default class IronBankTabComponent extends Component<IronBankTabComponentProps> {
    get ingame(): IngameGameState {
        return this.props.ingame;
    }

    get ironBank(): IronBank {
        return this.props.ingame.game.theIronBank;
    }

    render(): ReactNode {
        return <Col xs={12} className="h-100">
            <Row className="justify-content-center">
                <Col xs="11" style={{maxWidth: "550px", maxHeight: "225px"}}>
                    <IronBankInfosComponent
                        ingame={this.ingame}
                        ironBank={this.ironBank}
                    />
                </Col>
            </Row>
            <Row className="justify-content-center mt-4">
                {this.ironBank.loanSlots.slice().reverse().map((lc, i) => <Col xs="auto" key={`loan-slot-${i}`} className="pr-0">
                    <OverlayTrigger
                        overlay={<ImagePopover className="vertical-game-card" style={{ backgroundImage: lc ? `url(${loanCardImages.get(lc.type.id)})` : "none" }} />}
                        popperConfig={{ modifiers: [preventOverflow] }}
                        delay={{ show: 250, hide: 0 }}
                        placement="auto"
                    >
                        <div className="d-flex flex-row align-items-center">
                            {lc
                                ? <div className="vertical-game-card smedium hover-weak-outline" style={{ backgroundImage: lc ? `url(${loanCardImages.get(lc.type.id)})` : "none" }} />
                                : <div className="vertical-game-card game-card-slot smedium"/>}
                            <FontAwesomeIcon className="ml-2" icon={faCaretLeft} size="2x" />
                        </div>
                    </OverlayTrigger>
                    <Badge variant="secondary" style={{fontSize: "18px", marginTop: "10px", marginLeft: "35px"}}>{this.ironBank.loanCosts.slice().reverse()[i]}</Badge>
                </Col>)}
                <Col xs="auto">
                    <OverlayTrigger
                        overlay={renderLoanCardsToolTip(this.ironBank)}
                        trigger="click"
                        rootClose
                        placement="auto"
                    >
                        <div className="vertical-game-card smedium hover-smedium-outline clickable" style={{ backgroundImage: `url(${loanCardImages.get("back")})`}} />
                    </OverlayTrigger>
                </Col>
            </Row>
        </Col>;
    }
}