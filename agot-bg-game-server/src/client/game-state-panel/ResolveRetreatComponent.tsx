import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import React from "react";
import ResolveRetreatGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/resolve-retreat-game-state/ResolveRetreatGameState";
import SelectRegionComponent from "./SelectRegionComponent";
import GameStateComponentProps from "./GameStateComponentProps";
import renderChildGameState from "../utils/renderChildGameState";
import SelectRegionGameState from "../../common/ingame-game-state/select-region-game-state/SelectRegionGameState";
import SelectUnitsGameState from "../../common/ingame-game-state/select-units-game-state/SelectUnitsGameState";
import SelectUnitsComponent from "./SelectUnitsComponent";
import Col from "react-bootstrap/Col";
import {observable} from "mobx";
import Region from "../../common/ingame-game-state/game-data-structure/Region";

@observer
export default class ResolveRetreatComponent extends Component<GameStateComponentProps<ResolveRetreatGameState>> {

    @observable selectRegionComponent: SelectRegionComponent;

    render(): ReactNode {
        return (
            <>
                {this.props.gameState.childGameState instanceof SelectRegionGameState ? (
                    <>
                        <Col xs={12} className="text-center">
                            {this.props.gameState.childGameState.house.name} must choose the retreat location
                            of the defeated army.
                        </Col>
                        {this.selectRegionComponent && this.selectRegionComponent.selectedRegion && this.getUnitsToKillToRetreatTo(this.selectRegionComponent.selectedRegion) > 0 && (
                            <Col xs={12} className="text-center">
                                {this.getUnitsToKillToRetreatTo(this.selectRegionComponent.selectedRegion)} units would need
                                to be destroyed if you retreat to <strong>{this.selectRegionComponent.selectedRegion.name}</strong>.
                            </Col>
                        )}
                    </>
                ) : this.props.gameState.childGameState instanceof SelectUnitsGameState ? (
                    <Col xs={12} className="text-center">
                        {this.props.gameState.childGameState.house.name} must
                        choose {this.props.gameState.childGameState.count} casualties to reconcile their armies.
                    </Col>
                ) : null}
                {renderChildGameState(this.props, [
                    [SelectRegionGameState, SelectRegionComponent],
                    [SelectUnitsGameState, SelectUnitsComponent]
                ], c => c instanceof SelectRegionComponent ? this.selectRegionComponent = c : null)}
            </>
        );
    }

    getUnitsToKillToRetreatTo(region: Region): number {
        return this.props.gameState.getCasualtiesOfRetreatRegion(region);
    }
}
