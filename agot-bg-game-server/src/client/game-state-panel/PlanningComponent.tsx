import {Component, ReactNode} from "react";
import PlanningGameState from "../../common/ingame-game-state/planning-game-state/PlanningGameState";
import {observer} from "mobx-react";
import React from "react";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import * as _ from "lodash";
import ListGroupItem from "react-bootstrap/ListGroupItem";
import Row from "react-bootstrap/Row";
import { OverlayTrigger } from "react-bootstrap";
import { observable } from "mobx";
import BetterMap from "../../utils/BetterMap";
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

    @observable overlayTriggers = new BetterMap<Region, OverlayTrigger>();

    render(): ReactNode {
        return (
            <>
                <ListGroupItem>
                    <Row>
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
