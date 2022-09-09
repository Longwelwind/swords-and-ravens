import _ from "lodash";
import React from "react";
import { Col, Row, Tooltip } from "react-bootstrap";
import { OverlayChildren } from "react-bootstrap/esm/Overlay";
import IronBank from "../common/ingame-game-state/game-data-structure/IronBank";

export default function renderLoanCardsToolTip(ironBank: IronBank): OverlayChildren {
    const loanSlots = ironBank.loanSlots.filter(lc => lc != null);
    const loanDeck = _.orderBy(ironBank.loanCardDeck.filter(lc => !lc.discarded), lc => lc.type.name);
    const purchasedLoans = ironBank.purchasedLoansPerHouse;
    const discardedLoans = _.orderBy(ironBank.loanCardDeck.filter(lc => lc.discarded), lc => lc.type.name);

    return <Tooltip id={"loan-cards-tooltip"} className="tooltip-w-100">
        <Col>
            {loanSlots.length > 0 &&
                <Col xs={12} className="mb-3">
                    <Row className="justify-content-center mb-2">
                        <h5 className='text-center'>Loan slots</h5>
                    </Row>
                    {loanSlots.map((lc, i) => <Row key={`loan-slot_${lc?.id}-${i}`}>
                        <h6>{lc?.type.name}:&nbsp;</h6><p className="white-space-pre-line">{lc?.type.description}</p>
                    </Row>)}
                </Col>}
            {loanDeck.length > 0 &&
                <Col xs={12} className="mb-3">
                    <Row className="justify-content-center mb-2">
                        <h5 className='text-center'>Available loans</h5>
                    </Row>
                    {loanDeck.map((lc, i) => <Row key={`available-loan_${lc.id}-${i}`}>
                        <h6>{lc.type.name}:&nbsp;</h6><p className="white-space-pre-line">{lc.type.description}</p>
                    </Row>)}
                </Col>}
            {purchasedLoans.size > 0 &&
                <Col xs={12}>
                    <Row className="justify-content-center mb-2">
                        <h5 className='text-center'>Purchased loans</h5>
                    </Row>
                    {purchasedLoans.map((house, loans) => <Col xs={12} key={`purchased-loans_${house.id}`}>
                        <Row className="justify-content-center mb-2">
                            <h6>{house.name}</h6>
                        </Row>
                        {loans.map((lc, i) => <Row key={`purchased-loan_${lc.type.id}-${i}`}>
                            <h6>{lc.type.name}:&nbsp;</h6><p className="white-space-pre-line">{lc.type.description}</p>
                        </Row>)}
                    </Col>)}
                </Col>}
            {discardedLoans.length > 0 &&
                <Col xs={12} className="mb-3">
                    <Row className="justify-content-center mb-2">
                        <h5 className='text-center'>Discarded loans</h5>
                    </Row>
                    {discardedLoans.map((lc, i) => <Row key={`discarded-loan-${lc.id}-${i}`}>
                        <h6>{lc.type.name}:&nbsp;</h6><p className="white-space-pre-line">{lc.type.description}</p>
                    </Row>)}
                </Col>}
        </Col>
    </Tooltip>;
}