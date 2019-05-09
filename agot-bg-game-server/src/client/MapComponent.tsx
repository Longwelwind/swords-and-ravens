import {Component, ReactNode} from "react";
import GameClient from "./GameClient";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import * as React from "react";
import Border from "../common/ingame-game-state/game-data-structure/Border";
import Region from "../common/ingame-game-state/game-data-structure/Region";
import Unit from "../common/ingame-game-state/game-data-structure/Unit";
import PlanningGameState from "../common/ingame-game-state/planning-game-state/PlanningGameState";
import MapControls from "./MapControls";
import {observer} from "mobx-react";
import ActionGameState from "../common/ingame-game-state/action-game-state/ActionGameState";
import Order from "../common/ingame-game-state/game-data-structure/Order";
import backgroundImage from "../../public/images/westeros.jpg";
import houseOrderImages from "./houseOrderImages";
import orderImages from "./orderImages";
import unitImages from "./unitImages";
import classNames = require("classnames");
import housePowerTokensImages from "./housePowerTokensImages";

interface MapComponentProps {
    gameClient: GameClient;
    ingameGameState: IngameGameState;
    mapControls: MapControls;
}

@observer
export default class MapComponent extends Component<MapComponentProps> {
    render(): ReactNode {
        return (
            <div className="map" style={{backgroundImage: `url(${backgroundImage})`, backgroundSize: "cover", borderRadius: "0.25rem"}}>
                <div style={{position: "relative"}}>
                    {this.props.ingameGameState.world.regions.values.map(r => (
                        <div key={r.id}>
                            <div
                                className="units-container"
                                style={{left: r.unitSlot.x, top: r.unitSlot.y}}
                            >
                                {r.units.values.map(u => (
                                    <div key={u.id}
                                         onClick={() => this.onUnitClick(r, u)}
                                         className={classNames("unit-icon hover-weak-outline", {"medium-outline hover-strong-outline": this.shouldHighlightUnit(r, u)})}
                                         style={{
                                             backgroundImage: `url(${unitImages.get(u.allegiance.id).get(u.type.id)})`,
                                             opacity: u.wounded ? 0.5 : 1
                                         }}/>
                                ))}
                            </div>
                            {r.controlPowerToken && (
                                <div
                                    className="power-token hover-weak-outline"
                                    style={{
                                        left: r.powerTokenSlot.x,
                                        top: r.powerTokenSlot.y,
                                        backgroundImage: `url(${housePowerTokensImages.get(r.controlPowerToken.id)})`
                                    }}
                                >
                                </div>
                            )}
                        </div>
                    ))}
                    {/*this.props.ingameGameState.world.regions.values.filter(r => r.type != port).map(r => (
                        <Card
                            key={"name-" + r.id}
                            style={{left: r.nameSlot.x, top: r.nameSlot.y}}
                            className="region-label"
                        >
                            {r.name + "*".repeat(r.crownIcons) + (r.controlPowerToken ? r.controlPowerToken.name.substr(0, 1) : r.superControlPowerToken ? r.superControlPowerToken.name.substr(0, 1) : "")}
                        </Card>
                    ))*/}
                    <div>
                        {this.props.ingameGameState.world.regions.values.map(r => (
                            this.props.ingameGameState.childGameState instanceof PlanningGameState ? (
                                this.displayOrderPlanningGameState(this.props.ingameGameState.childGameState, r)
                            ) : this.props.ingameGameState.childGameState instanceof ActionGameState && (
                                this.displayOrderActionGameState(this.props.ingameGameState.childGameState, r)
                            )
                        ))}
                    </div>
                </div>
                <svg style={{width: "741px", height: "1378px"}}>
                    {this.props.ingameGameState.world.regions.values.map(r => (
                        <polygon
                            points={this.getRegionPath(r)} fill="white"
                            fillRule="evenodd"
                            className={classNames("region-area", {"highlighted-region-area clickable": this.shouldHighlightRegion(r)})}
                            onClick={() => this.onRegionClick(r)}
                            key={r.id}
                        />
                    ))}
                </svg>
            </div>
        )
    }

    displayOrderPlanningGameState(planningGameState: PlanningGameState, r: Region): ReactNode {
        const orderPresent = planningGameState.placedOrders.has(r);
        const order = orderPresent ? planningGameState.placedOrders.get(r) : null;

        if (orderPresent) {
            const controller = r.getController();

            if (!controller) {
                // Should never happen. If there's an order, there's a controller.
                throw new Error();
            }

            const backgroundUrl = order ? orderImages.get(order.type.id) : houseOrderImages.get(controller.id);

            return this.renderOrder(r, order, backgroundUrl);
        }

        return false;
    }

    displayOrderActionGameState(actionGameState: ActionGameState, r: Region): ReactNode {
        if (!actionGameState.ordersOnBoard.has(r)) {
            return;
        }

        const order = actionGameState.ordersOnBoard.get(r);

        return this.renderOrder(r, order, orderImages.get(order.type.id));
    }

    renderOrder(region: Region, order: Order| null, backgroundUrl: string): ReactNode {
        return (
            <div className={classNames("order-container", "hover-weak-outline", {"medium-outline hover-strong-outline clickable": order ? this.shouldHighlightOrder(region, order) : false})}
                 style={{left: region.orderSlot.x, top: region.orderSlot.y}}
                 onClick={() => order ? this.onOrderClick(region, order) : undefined}
                 key={"region-" + region.id}
            >
                <div className="order-icon" style={{
                    backgroundImage: `url(${backgroundUrl})`
                }}/>
            </div>
        );
    }

    onUnitClick(region: Region, unit: Unit): void {
        this.props.mapControls.onUnitClick.forEach(f => f(region, unit));
    }

    onRegionClick(region: Region): void {
        this.props.mapControls.onRegionClick.forEach(f => f(region));
    }

    onOrderClick(region: Region, order: Order): void {
        this.props.mapControls.onOrderClick.forEach(f => f(region, order));
    }

    getBorderPathD(border: Border): string {
        return border.polygon.map(p => p.x + "," + p.y).join(" ");
    }

    getColorUnitSlot(r: Region): string {
        const controller = r.getController();

        return controller ? controller.color : "";
    }

    getRegionPath(region: Region): string {
        const points = this.props.ingameGameState.world.getContinuousBorder(region);

        return points.map(p => p.x + "," + p.y).join(" ");
    }

    shouldHighlightRegion(region: Region): boolean {
        return this.props.mapControls.shouldHighlightRegion.some(f => f(region));
    }

    shouldHighlightOrder(region: Region, order: Order): boolean {
        return this.props.mapControls.shouldHighlightOrder.some(f => f(region, order));
    }

    shouldHighlightUnit(region: Region, unit: Unit): boolean {
        return this.props.mapControls.shouldHighlightUnit.some(f => f(region, unit));
    }
}
