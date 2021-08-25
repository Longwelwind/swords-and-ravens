import {Component, ReactNode} from "react";
import PlanningGameState from "../../common/ingame-game-state/planning-game-state/PlanningGameState";
import {observer} from "mobx-react";
import React from "react";
import ListGroupItem from "react-bootstrap/ListGroupItem";
import Row from "react-bootstrap/Row";
import GameStateComponentProps from "./GameStateComponentProps";
import ClaimVassalsGameState from "../../common/ingame-game-state/planning-game-state/claim-vassals-game-state/ClaimVassalsGameState";
import PlaceOrdersGameState from "../../common/ingame-game-state/planning-game-state/place-orders-game-state/PlaceOrdersGameState";
import renderChildGameState from "../utils/renderChildGameState";
import ClaimVassalsComponent from "./ClaimVassalsComponent";
import PlaceOrdersComponent from "./PlaceOrdersComponent";

@observer
export default class PlanningComponent extends Component<GameStateComponentProps<PlanningGameState>> {
    modifyRegionsOnMapCallback: any;
    modifyOrdersOnMapCallback: any;

    render(): ReactNode {
        return (
            <>
                <ListGroupItem>
                    <Row className="justify-content-center">
                        {renderChildGameState(this.props, [
                            [PlaceOrdersGameState, PlaceOrdersComponent],
                            [ClaimVassalsGameState, ClaimVassalsComponent],
                        ])}
                    </Row>
                </ListGroupItem>
            </>
        );
    }
}
