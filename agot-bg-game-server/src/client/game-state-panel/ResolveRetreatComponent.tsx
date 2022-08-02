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
        const unitCountToBeDestroyed = (this.selectRegionComponent && this.selectRegionComponent.selectedRegion)
            ? this.getUnitCountToBeDestroyedByRetreatTo(this.selectRegionComponent.selectedRegion)
            : 0;
        return (
            <>
                {this.props.gameState.childGameState instanceof SelectRegionGameState ? (
                    <>
                        <Col xs={12} className="text-center">
                            House <b>{this.props.gameState.childGameState.house.name}</b> must choose the retreat location
                            of the defeated army.
                        </Col>
                        {unitCountToBeDestroyed > 0 && this.selectRegionComponent && this.selectRegionComponent.selectedRegion && (
                            <Col xs={12} className="text-center">
                                <b>{unitCountToBeDestroyed}</b> unit{unitCountToBeDestroyed > 1 ? "s" : ""} must
                                be destroyed if you retreat to <b>{this.selectRegionComponent.selectedRegion.name}</b>.
                            </Col>
                        )}
                    </>
                ) : this.props.gameState.childGameState instanceof SelectUnitsGameState ? (
                    <Col xs={12} className="text-center">
                        House <b>{this.props.gameState.childGameState.house.name}</b> must
                        choose <b>{this.props.gameState.childGameState.count}</b> casualt{this.props.gameState.childGameState.count > 1 ? "ies" : "y"} to
                        retreat to <b>{this.props.gameState.retreatRegion?.name ?? "Unknown"}</b>.
                    </Col>
                ) : null}
                {renderChildGameState(this.props, [
                    [SelectRegionGameState, SelectRegionComponent],
                    [SelectUnitsGameState, SelectUnitsComponent]
                ], c => c instanceof SelectRegionComponent ? this.selectRegionComponent = c : null)}
            </>
        );
    }

    getUnitCountToBeDestroyedByRetreatTo(region: Region): number {
        return this.props.gameState.getCasualtiesOfRetreatRegion(region);
    }
}
