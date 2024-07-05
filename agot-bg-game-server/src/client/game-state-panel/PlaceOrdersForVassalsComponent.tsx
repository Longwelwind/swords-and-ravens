import { Component, ReactNode } from "react";
import { observer } from "mobx-react";
import React from "react";
import GameStateComponentProps from "./GameStateComponentProps";
import renderChildGameState from "../utils/renderChildGameState";
import { Row } from "react-bootstrap";
import PlaceOrdersForVassalsGameState from "../../common/ingame-game-state/planning-game-state/place-orders-for-vassals-game-state/PlaceOrdersForVassalsGameState";
import ResolveSinglePlaceOrdersForVassalsGameState from "../../common/ingame-game-state/planning-game-state/place-orders-for-vassals-game-state/resolve-single-place-orders-for-vassals-game-state/ResolveSinglePlaceOrdersForVassalsGameState";
import ResolveSinglePlaceOrdersForVassalsComponent from "./ResolveSinglePlaceOrdersForVassalsComponent";

@observer
export default class PlaceOrdersForVassalsComponent extends Component<GameStateComponentProps<PlaceOrdersForVassalsGameState>> {
    render(): ReactNode {
        return <Row className="justify-content-center">
            {renderChildGameState(this.props, [
                [ResolveSinglePlaceOrdersForVassalsGameState, ResolveSinglePlaceOrdersForVassalsComponent]
            ])}
        </Row>;
    }
}
