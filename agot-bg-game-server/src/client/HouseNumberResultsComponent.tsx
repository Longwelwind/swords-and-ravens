import { Component, ReactNode } from "react";
import React from "react";
import House from "../common/ingame-game-state/game-data-structure/House";
import HouseIconComponent from "./game-state-panel/utils/HouseIconComponent";
import { Col, Row } from "react-bootstrap";
import ConditionalWrap from "./utils/ConditionalWrap";

interface HouseNumberResultsProps {
    results: [House, number][];
    keyPrefix?: string;
    bold?: boolean;
    makeGreyjoyBlack?: boolean;
}

export default class HouseNumberResultsComponent extends Component<HouseNumberResultsProps> {
    render(): ReactNode {
        return <Row>
            {this.props.results.map(([house, result]) => (
                <Col xs="auto" key={`${this.props.keyPrefix ?? ""}_house-number-result_${house.id}`} className="d-flex flex-md-column align-items-center p-1">
                    <div className="mb-2">
                        <HouseIconComponent house={house} makeGreyjoyBlack={this.props.makeGreyjoyBlack} />
                    </div>
                    <ConditionalWrap
                        condition={this.props.bold ?? false}
                        wrap={children =>
                            <b>
                                {children}
                            </b>
                        }>
                        <div className="text-center" style={{ fontSize: "18px", marginBottom: "5px" }}>
                            {result}
                        </div>
                    </ConditionalWrap>
                </Col>))}
        </Row>;
    }
}