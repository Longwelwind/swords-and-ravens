import { Component, ReactNode } from "react";
import React from "react";
import House from "../common/ingame-game-state/game-data-structure/House";
import SimpleInfluenceIconComponent from "./game-state-panel/utils/SimpleInfluenceIconComponent";
import { Col, Row } from "react-bootstrap";

interface HouseNumberResultsProps {
    results: [House, number][];
    key?: string;
}

export default class HouseNumberResultsComponent extends Component<HouseNumberResultsProps> {
    render(): ReactNode {
        return <Row>
            {this.props.results.map(([house, result]) => (
            <Col xs="auto" key={`house-number-result-for-${house.id}`} className="d-flex flex-md-column align-items-center">
                <div className="mb-2">
                    <SimpleInfluenceIconComponent house={house}/>
                </div>
                <div className="text-center" style={{fontSize: "18px", marginBottom: "5px"}}>{result}</div>
            </Col>))}
        </Row>;
    }
}