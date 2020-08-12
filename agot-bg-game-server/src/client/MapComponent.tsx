import {Component, ReactNode} from "react";
import GameClient from "./GameClient";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import * as React from "react";
import Region from "../common/ingame-game-state/game-data-structure/Region";
import Unit from "../common/ingame-game-state/game-data-structure/Unit";
import PlanningGameState from "../common/ingame-game-state/planning-game-state/PlanningGameState";
import MapControls, {OrderOnMapProperties, RegionOnMapProperties, UnitOnMapProperties} from "./MapControls";
import {observer} from "mobx-react";
import ActionGameState from "../common/ingame-game-state/action-game-state/ActionGameState";
import Order from "../common/ingame-game-state/game-data-structure/Order";
import backgroundImage from "../../public/images/westeros.jpg";
import houseOrderImages from "./houseOrderImages";
import orderImages from "./orderImages";
import unitImages from "./unitImages";
import classNames = require("classnames");
import housePowerTokensImages from "./housePowerTokensImages";
import garrisonTokens from "./garrisonTokens";
import {OverlayTrigger, Tooltip} from "react-bootstrap";
import ConditionalWrap from "./utils/ConditionalWrap";
import BetterMap from "../utils/BetterMap";
import _ from "lodash";
import PartialRecursive from "../utils/PartialRecursive";
import joinReactNodes from "./utils/joinReactNodes";
import StaticBorder from "../common/ingame-game-state/game-data-structure/static-data-structure/StaticBorder";
import { land } from "../common/ingame-game-state/game-data-structure/regionTypes";

interface MapComponentProps {
    gameClient: GameClient;
    ingameGameState: IngameGameState;
    mapControls: MapControls;
}

@observer
export default class MapComponent extends Component<MapComponentProps> {
    refOverlayTriggerRegion: OverlayTrigger;

    render(): ReactNode {
        return (
            <div className="map"
                 style={{backgroundImage: `url(${backgroundImage})`, backgroundSize: "cover", borderRadius: "0.25rem"}}>
                <div style={{position: "relative"}}>
                    {this.props.ingameGameState.world.regions.values.map(r => (
                        <div key={r.id}>
                            {r.garrison > 0 && r.garrison != 1000 && (
                                <div
                                    className="garrison-token hover-weak-outline"
                                    style={{
                                        backgroundImage: `url(${garrisonTokens.get(r.id)})`,
                                        left: r.unitSlot.point.x, top: r.unitSlot.point.y
                                    }}
                                >
                                </div>
                            )}
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
                    {this.renderUnits()}
                    {this.renderOrders()}
                </div>
                <svg style={{width: "741px", height: "1378px"}}>
                    {this.renderRegions()}
                </svg>
            </div>
        )
    }

    renderRegions(): ReactNode {
        const propertiesForRegions = this.getModifiedPropertiesForEntities<Region, RegionOnMapProperties>(
            this.props.ingameGameState.world.regions.values,
            this.props.mapControls.modifyRegionsOnMap,
            {highlight: {active: false, color: "white"}, onClick: null, wrap: null}
        );

        return propertiesForRegions.entries.map(([region, properties]) => {
            const blocked = region.garrison == 1000;
            const wrap = properties.wrap;

            return (
                <ConditionalWrap condition={!blocked}
                    key={region.id}
                    wrap={wrap ? wrap : child =>
                        <OverlayTrigger
                            overlay={this.renderRegionTooltip(region)}
                            delay={{ show: 750, hide: 100 }}
                            placement="auto"
                            rootClose
                        >
                            {child}
                        </OverlayTrigger>
                    }
                >
                    <polygon
                        points={this.getRegionPath(region)}
                        fill={blocked ? "black" : properties.highlight.color}
                        fillRule="evenodd"
                        className={classNames(
                            blocked ? "blocked-region" : "region-area",
                            properties.highlight.active && {
                                "clickable": true,
                                // Whatever the strength of the highlight defined, show the same
                                // highlightness
                                "highlighted-region-area": true
                            }
                        )}
                        onClick={properties.onClick != null ? properties.onClick : undefined} />
                </ConditionalWrap>
            );
        });
    }

    private renderRegionTooltip(region: Region): ReactNode {
        const controller =  region.getController();

        return <Tooltip id="region-details">
            <b>{region.name}</b> {controller && (<small>of <b>{controller.name}</b></small>)} {region.castleLevel > 0 && (<small> ({region.castleLevel == 1 ? "Castle" : "Stronghold"})</small>)}
            {region.superControlPowerToken ? (
                <small><br/>Capital of {region.superControlPowerToken.name} {region.garrison > 0 && <>(Garrison of <b>{region.garrison}</b>)</>}</small>
            ) : (
                region.garrison > 0 && (<small><br />Neutral force of <b>{region.garrison}</b></small>)
            )}
            {(region.supplyIcons > 0 || region.crownIcons) > 0 && (
                <>
                    <br />{region.supplyIcons > 0 && <><b>{region.supplyIcons}</b> Barrel{region.supplyIcons > 1 && "s"}</>}
                    {(region.supplyIcons > 0 && region.crownIcons > 0) && " - "}
                    {region.crownIcons > 0 && <><b>{region.crownIcons}</b> Crown{region.crownIcons > 1 && "s"}</>}
                </>
            )}
            {region.units.size > 0 && (
                <><br/>{joinReactNodes(region.units.values.map(u => u.wounded ? <s key={u.id}>{u.type.name}</s> : <b key={u.id}>{u.type.name}</b>), ", ")}</>
            )}
        </Tooltip>;
    }

    renderUnits(): ReactNode {
        const propertiesForUnits = this.getModifiedPropertiesForEntities<Unit, UnitOnMapProperties>(
            _.flatMap(this.props.ingameGameState.world.regions.values.map(r => r.units.values)),
            this.props.mapControls.modifyUnitsOnMap,
            {highlight: {active: false, color: "white"}, onClick: null}
        );

        return this.props.ingameGameState.world.regions.values.map(r => {
            const controller = r.getController();
            return <div
                key={r.id}
                className="units-container"
                style={{left: r.unitSlot.point.x, top: r.unitSlot.point.y, width: r.unitSlot.width, flexWrap: r.type == land ? "wrap-reverse" : "wrap"}}
            >
                {r.units.values.map(u => {
                    const property = propertiesForUnits.get(u);

                    let opacity: number;
                    // css transform
                    let transform: string;

                    if (!u.wounded) {
                        opacity = 1;
                        transform = `none`;
                    } else if (u.type.name == "Ship") {
                        opacity = 0.5;
                        transform = `none`;
                    } else {
                        opacity = 0.7;
                        transform = `rotate(90deg)`;
                    }

                return <OverlayTrigger
                            key={"unit-overlay-" + u.id}
                            delay={{ show: 750, hide: 100 }}
                            placement="auto"
                            overlay={<Tooltip id={"unit-tooltip-" + u.id}>
                                <b>{u.type.name}</b>{controller != null && <small> of <b>{controller.name}</b></small>}
                            </Tooltip>}
                        >
                            <div onClick={property.onClick ? property.onClick : undefined}
                                className={classNames(
                                    "unit-icon hover-weak-outline",
                                    {
                                        "medium-outline hover-strong-outline": property.highlight.active
                                    },
                                    {
                                        "attacking-army-highlight": property.highlight.color == "red"
                                    }
                                )}
                                style={{
                                    backgroundImage: `url(${unitImages.get(u.allegiance.id).get(u.type.id)})`,
                                    opacity: opacity,
                                    transform: transform
                                }}
                            />
                        </OverlayTrigger>
                })}
            </div>
        });
    }

    renderOrders(): ReactNode {
        const propertiesForOrders = this.getModifiedPropertiesForEntities<Region, OrderOnMapProperties>(
            _.flatMap(this.props.ingameGameState.world.regions.values),
            this.props.mapControls.modifyOrdersOnMap,
            {highlight: {active: false, color: "white"}, onClick: null}
        );

        return propertiesForOrders.map((region, properties) => {

            if (this.props.ingameGameState.childGameState instanceof PlanningGameState) {
                const planningGameState = this.props.ingameGameState.childGameState;
                const orderPresent = planningGameState.placedOrders.has(region);
                const order = orderPresent ? planningGameState.placedOrders.get(region) : null;

                if (orderPresent) {
                    const controller = region.getController();

                    if (!controller) {
                        // Should never happen. If there's an order, there's a controller.
                        throw new Error("Should never happen. If there's an order, there's a controller.");
                    }

                    const backgroundUrl = order ? orderImages.get(order.type.id) : houseOrderImages.get(controller.id);

                    return this.renderOrder(region, order, backgroundUrl, properties, false);
                }
            } else if (this.props.ingameGameState.childGameState instanceof ActionGameState) {
                const actionGameState = this.props.ingameGameState.childGameState;

                if (!actionGameState.ordersOnBoard.has(region)) {
                    return;
                }

                const order = actionGameState.ordersOnBoard.get(region);

                return this.renderOrder(region, order, orderImages.get(order.type.id), properties, true);
            }

            return false;
        });
    }

    /**
     * This is used to call modifyRegionOnMap, modifyUnitOnMap and merge the properties
     * of an entity (Region, Unit, ...) that have been modified by `...GameStateComponent` classes.
     * @param entities
     * @param modifyPropertiesFunctions
     * @param defaultProperties
     */
    getModifiedPropertiesForEntities<Entity, Property>(entities: Entity[], modifyPropertiesFunctions: (() => [Entity, PartialRecursive<Property>][])[], defaultProperties: Property): BetterMap<Entity, Property> {
        // Create a Map of properties for all regions that will be shown
        const propertiesForEntities = new BetterMap<Entity, Property>();
        entities.forEach(entity => {
            propertiesForEntities.set(entity, defaultProperties);
        });

        modifyPropertiesFunctions.forEach(modifyPropertiesFunction => {
            const modifiedPropertiesForEntities = modifyPropertiesFunction();

            modifiedPropertiesForEntities.forEach(([entity, modifiedProperties]) => {
                if (propertiesForEntities.has(entity)) {
                    propertiesForEntities.set(entity, _.merge(propertiesForEntities.get(entity), modifiedProperties));
                }
            });
        });

        return propertiesForEntities;
    }

    renderOrder(region: Region, order: Order | null, backgroundUrl: string, properties: OrderOnMapProperties, _isActionGameState: boolean): ReactNode {
        return (
            <div className={classNames(
                    "order-container", "hover-weak-outline",
                    {
                        "medium-outline hover-strong-outline clickable": properties.highlight.active
                    }
                )}
                 style={{left: region.orderSlot.x, top: region.orderSlot.y}}
                 onClick={properties.onClick ? properties.onClick : undefined}
                 key={"region-" + region.id}
            >
                <OverlayTrigger overlay={this.renderOrderTooltip(order, region)}
                    delay={{show: 750, hide: 100}}>
                    <div className="order-icon" style={{backgroundImage: `url(${backgroundUrl})`}}/>
                </OverlayTrigger>
            </div>
        );
    }

    private renderOrderTooltip(order: Order | null, region: Region): ReactNode {
        const regionController = region.getController();

        return <Tooltip id={"order-info"}>
            <b>{order ? order.type.name : "Order token"}</b>{regionController != null && <small> of <b>{regionController.name}</b></small>}
        </Tooltip>;
    }

    getBorderPathD(border: StaticBorder): string {
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
}
