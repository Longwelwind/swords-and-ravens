import { Component, ReactNode } from "react";
import React from "react";
import House from "../common/ingame-game-state/game-data-structure/House";
import SimpleInfluenceIconComponent from "./game-state-panel/utils/SimpleInfluenceIconComponent";
import { Col, Row } from "react-bootstrap";
import ConditionalWrap from "./utils/ConditionalWrap";

interface HouseNumberResultsProps {
    results: [House, number][];
    key?: string;
    bold?: boolean;
}

export default class HouseNumberResultsComponent extends Component<HouseNumberResultsProps> {
    render(): ReactNode {
        return <Row>
            {this.props.results.map(([house, result]) => (
                <Col xs="auto" key={`${this.props.key ?? ""}_house-number-result_${house.id}`} className="d-flex flex-md-column align-items-center p-1">
                    <div className="mb-2">
                        <SimpleInfluenceIconComponent house={house} />
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