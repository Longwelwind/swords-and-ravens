import { Component, ReactNode } from "react";
import GameClient from "./GameClient";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import * as React from "react";
import Region from "../common/ingame-game-state/game-data-structure/Region";
import Unit from "../common/ingame-game-state/game-data-structure/Unit";
import PlanningGameState from "../common/ingame-game-state/planning-game-state/PlanningGameState";
import MapControls, { OrderOnMapProperties, RegionOnMapProperties, UnitOnMapProperties } from "./MapControls";
import { observer } from "mobx-react";
import ActionGameState from "../common/ingame-game-state/action-game-state/ActionGameState";
import Order from "../common/ingame-game-state/game-data-structure/Order";
import westerosImage from "../../public/images/westeros.jpg";
import westeros7pImage from "../../public/images/westeros-7p.jpg";
import westerosWithEssosImage from "../../public/images/westeros-with-essos.jpg";
import ffcEyrieWithPortImage from "../../public/images/ffc-eyrie-with-port.jpg";
import castleDegradeImage from "../../public/images/region-modifications/CastleDegrade.png"
import castleUpgradeImage from "../../public/images/region-modifications/CastleUpgrade.png"
import barrelImage from "../../public/images/region-modifications/Barrel.png"
import crownImage from "../../public/images/region-modifications/Crown.png"
import houseOrderImages from "./houseOrderImages";
import orderImages from "./orderImages";
import unitImages from "./unitImages";
import classNames from "classnames";
import housePowerTokensImages from "./housePowerTokensImages";
import { Col, OverlayTrigger, Tooltip } from "react-bootstrap";
import ConditionalWrap from "./utils/ConditionalWrap";
import BetterMap from "../utils/BetterMap";
import _ from "lodash";
import PartialRecursive from "../utils/PartialRecursive";
import { land, sea } from "../common/ingame-game-state/game-data-structure/regionTypes";
import PlaceOrdersGameState from "../common/ingame-game-state/planning-game-state/place-orders-game-state/PlaceOrdersGameState";
import UseRavenGameState from "../common/ingame-game-state/action-game-state/use-raven-game-state/UseRavenGameState";
import { renderRegionTooltip } from "./regionTooltip";
import getGarrisonToken from "./garrisonTokens";
import { ship } from "../common/ingame-game-state/game-data-structure/unitTypes";
import { OverlayChildren } from "react-bootstrap/esm/Overlay";
import loyaltyTokenImage from "../../public/images/power-tokens/Loyalty.png"
import loanCardImages from "./loanCardImages";
import StaticIronBankView from "../common/ingame-game-state/game-data-structure/static-data-structure/StaticIronBankView";
import preventOverflow from "@popperjs/core/lib/modifiers/preventOverflow";
import IronBankInfosComponent from "./IronBankInfosComponent";
import invertColor from "./utils/invertColor";
import ImagePopover from "./utils/ImagePopover";
import renderLoanCardsToolTip from "./loanCardsTooltip";

export const MAP_HEIGHT = 1378;
export const MAP_WIDTH = 741;
export const DELUXE_MAT_WIDTH = 1204;
const BLOCKED_REGION_BY_INFINITE_GARRISON = 1000;

interface MapComponentProps {
    gameClient: GameClient;
    ingameGameState: IngameGameState;
    mapControls: MapControls;
}

@observer
export default class MapComponent extends Component<MapComponentProps> {
    backgroundImage: string = westerosImage;
    mapWidth: number = MAP_WIDTH;

    get ingame(): IngameGameState {
        return this.props.ingameGameState;
    }

    constructor(props: MapComponentProps) {
        super(props);
        const settings = this.ingame.entireGame.gameSettings;

        this.backgroundImage = settings.addPortToTheEyrie
            ? ffcEyrieWithPortImage
            : this.ingame.entireGame.gameSettings.playerCount == 7
                ? westeros7pImage
                : this.ingame.entireGame.gameSettings.playerCount >= 8
                    ? westerosWithEssosImage
                    : westerosImage;

        this.mapWidth = this.ingame.entireGame.gameSettings.playerCount >= 8 ? DELUXE_MAT_WIDTH : MAP_WIDTH;
    }

    render(): ReactNode {
        const garrisons = new BetterMap<string, string | null>();
        const castleModifiers = new BetterMap<string, number>();
        const barrelModifiers = new BetterMap<string, number>();
        const crownModifiers = new BetterMap<string, number>();

        for (const region of this.props.ingameGameState.world.regions.values) {
            if (region.garrison > 0 && region.garrison != BLOCKED_REGION_BY_INFINITE_GARRISON) {
                garrisons.set(region.id, getGarrisonToken(region.garrison));
            }

            if (region.castleModifier != 0) {
                castleModifiers.set(region.id, region.castleModifier);
            }

            if (region.barrelModifier != 0) {
                barrelModifiers.set(region.id, region.barrelModifier);
            }

            if (region.crownModifier != 0) {
                crownModifiers.set(region.id, region.crownModifier);
            }
        }
        const ironBankView = this.ingame.world.ironBankView;

        const propertiesForRegions = this.getModifiedPropertiesForEntities<Region, RegionOnMapProperties>(
            this.props.ingameGameState.world.regions.values,
            this.props.mapControls.modifyRegionsOnMap,
            { highlight: { active: false, color: "white" }, onClick: null, wrap: null }
        );

        return (
            <div className="map"
                style={{ backgroundImage: `url(${this.backgroundImage})`, backgroundSize: "cover", borderRadius: "0.25rem" }}>
                <div style={{ position: "relative" }}>
                    {this.props.ingameGameState.world.regions.values.map(r => (
                        <div key={r.id}>
                            {castleModifiers.has(r.id) && (
                                <OverlayTrigger
                                    overlay={renderRegionTooltip(r)}
                                    delay={{ show: 750, hide: 100 }}
                                    placement="auto"
                                    popperConfig={{ modifiers: [preventOverflow] }}
                                >
                                    <div
                                        className="castle-modification"
                                        style={{
                                            backgroundImage: castleModifiers.get(r.id) > 0 ? `url(${castleUpgradeImage})` : `url(${castleDegradeImage})`,
                                            left: r.castleSlot.x, top: r.castleSlot.y
                                        }}
                                    />
                                </OverlayTrigger>
                            )}
                            {(barrelModifiers.has(r.id) || crownModifiers.has(r.id)) && this.renderImprovements(r)}
                            {r.overwrittenSuperControlPowerToken &&
                                <OverlayTrigger
                                    overlay={<Tooltip id={"power-token-" + r.id}>
                                        <Col className="text-center"><h6>Printed Power token<small> of <b>{r.getController()?.name ?? "Unknown"}<br />{r.name}</b></small></h6></Col>
                                    </Tooltip>}
                                    key={"super-power-token-overlay-" + r.id}
                                    delay={{ show: 500, hide: 100 }}
                                    placement="auto"
                                    popperConfig={{ modifiers: [preventOverflow] }}
                                >
                                    <div
                                        className="power-token hover-weak-outline"
                                        style={{
                                            left: r.powerTokenSlot.x,
                                            top: r.powerTokenSlot.y,
                                            backgroundImage: `url(${housePowerTokensImages.get(r.overwrittenSuperControlPowerToken.id)})`
                                        }}
                                    >
                                    </div>
                                </OverlayTrigger>
                            }
                            {r.controlPowerToken && (
                                <OverlayTrigger
                                    overlay={<Tooltip id={"power-token-" + r.id}>
                                        <Col className="text-center"><h6>Power token<small> of <b>{r.getController()?.name ?? "Unknown"}<br />{r.name}</b></small></h6></Col>
                                    </Tooltip>}
                                    key={"power-token-overlay-" + r.id}
                                    delay={{ show: 500, hide: 100 }}
                                    placement="auto"
                                    popperConfig={{ modifiers: [preventOverflow] }}
                                >
                                    <div
                                        className="power-token hover-weak-outline"
                                        style={{
                                            left: r.powerTokenSlot.x,
                                            top: r.powerTokenSlot.y,
                                            backgroundImage: `url(${housePowerTokensImages.get(r.controlPowerToken.id)})`
                                        }}
                                    >
                                    </div>
                                </OverlayTrigger>
                            )}
                        </div>
                    ))}
                    {this.renderUnits(garrisons)}
                    {this.renderOrders()}
                    {this.renderRegionTexts(propertiesForRegions)}
                    {this.renderIronBankInfos(ironBankView)}
                    {this.renderLoanCardDeck(ironBankView)}
                    {this.renderLoanCardSlots(ironBankView)}
                </div>
                <svg style={{ width: `${this.mapWidth}px`, height: `${MAP_HEIGHT}px` }}>
                    {this.renderRegions(propertiesForRegions)}
                </svg>
            </div>
        )
    }

    private renderLoanCardSlots(ironBankView: StaticIronBankView | null): ReactNode {
        return ironBankView && this.ingame.game.ironBank && this.ingame.game.ironBank.loanSlots.map((lc, i) => (
            <OverlayTrigger
                key={`loan-slot-${i}`}
                overlay={<ImagePopover className="vertical-game-card" style={{ backgroundImage: lc ? `url(${loanCardImages.get(lc.type.id)})` : "none" }} />}
                popperConfig={{ modifiers: [preventOverflow] }}
                delay={{ show: 250, hide: 0 }}
                placement="auto"
            >
                <div className="order-container" style={{
                    left: ironBankView.loanSlots[i].point.x,
                    top: ironBankView.loanSlots[i].point.y
                }}
                >
                    <div className="iron-bank-content hover-weak-outline" style={{ backgroundImage: lc ? `url(${loanCardImages.get(lc.type.id)})` : "none", width: ironBankView.loanSlots[i].width, height: ironBankView.loanSlots[i].height }} />
                </div>
            </OverlayTrigger>
        ));
    }

    private renderLoanCardDeck(ironBankView: StaticIronBankView | null): ReactNode {
        return ironBankView && <OverlayTrigger
            overlay={renderLoanCardsToolTip(this.ingame.game.theIronBank)}
            trigger="click"
            rootClose
            placement="auto"
        >
            <div id="loan-card-deck" className="order-container clickable" style={{
                left: ironBankView.deckSlot.point.x,
                top: ironBankView.deckSlot.point.y
            }}>
                <div className="iron-bank-content hover-weak-outline" style={{ backgroundImage: `url(${loanCardImages.get("back")})`, width: ironBankView.deckSlot.width, height: ironBankView.deckSlot.height }} />
            </div>
        </OverlayTrigger>;
    }

    private renderIronBankInfos(ironBankView: StaticIronBankView | null): ReactNode {
        return ironBankView && <div id="iron-bank-info" style={{
            position: "absolute",
            left: ironBankView.infoComponentSlot.point.x,
            top: ironBankView.infoComponentSlot.point.y,
            height: ironBankView.infoComponentSlot.height,
            width: ironBankView.infoComponentSlot.width
        }}
        >
            <IronBankInfosComponent ingame={this.ingame} ironBank={this.ingame.game.theIronBank} />
        </div>;
    }

    renderRegions(propertiesForRegions: BetterMap<Region, RegionOnMapProperties>): ReactNode {
        return propertiesForRegions.entries.map(([region, properties]) => {
            const blocked = region.garrison == BLOCKED_REGION_BY_INFINITE_GARRISON;
            const wrap = properties.wrap;

            return (
                <ConditionalWrap condition={!blocked}
                    key={region.id}
                    wrap={wrap ? wrap : child =>
                        <OverlayTrigger
                            overlay={renderRegionTooltip(region)}
                            delay={{ show: 750, hide: 100 }}
                            placement="auto"
                            popperConfig={{ modifiers: [preventOverflow] }}
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
                                "highlighted-region-area": true,
                                "highlighted-region-area-light": properties.highlight.light,
                                "highlighted-region-area-strong": properties.highlight.strong
                            }
                        )}
                        onClick={properties.onClick != null ? properties.onClick : undefined} />
                </ConditionalWrap>
            );
        });
    }

    renderRegionTexts(propertiesForRegions: BetterMap<Region, RegionOnMapProperties>): ReactNode {
        return propertiesForRegions.entries.filter(([_region, properties]) => properties.highlight.text).map(([region, properties]) => {
            const nameSlot = region.staticRegion.nameSlot;
            return <div key={`region_text_${region.id}`}
                className="units-container"
                style={{
                    left: nameSlot.x,
                    top: nameSlot.y,
                    textAlign: "center",
                    fontWeight: "bold",
                    fontFamily: "serif",
                    fontSize: "4rem",
                    color: invertColor(properties.highlight.color)
                }}
            >
                {properties.highlight.text ?? ""}
            </div>;
        });
    }

    renderUnits(garrisons: BetterMap<string, string | null>): ReactNode {
        const propertiesForUnits = this.getModifiedPropertiesForEntities<Unit, UnitOnMapProperties>(
            _.flatMap(this.props.ingameGameState.world.regions.values.map(r => r.allUnits)),
            this.props.mapControls.modifyUnitsOnMap,
            { highlight: { active: false, color: "white" }, onClick: null }
        );

        const garrisonControllers = new BetterMap(garrisons.keys.map(rid => [rid, this.props.ingameGameState.world.regions.get(rid).getController()]));

        return this.props.ingameGameState.world.regions.values.map(r => {
            const controller = r.getController();
            return <div
                key={r.id}
                className="units-container"
                style={{ left: r.unitSlot.point.x, top: r.unitSlot.point.y, width: r.unitSlot.width, flexWrap: r.type == land ? "wrap-reverse" : "wrap" }}
            >
                {r.allUnits.map(u => {
                    const property = propertiesForUnits.get(u);

                    let opacity: number;
                    // css transform
                    let transform: string;

                    if (!u.wounded) {
                        opacity = 1;
                        transform = `none`;
                    } else if (u.type == ship) {
                        opacity = 0.5;
                        transform = `none`;
                    } else {
                        opacity = 0.7;
                        transform = `rotate(90deg)`;
                    }

                    return <OverlayTrigger
                        overlay={<Tooltip id={"unit-tooltip-" + u.id} className="tooltip-w-100">
                            <Col className="text-center"><h6>{u.type.name}<small> of <b>{controller?.name ?? "Unknown"}</b><br /><b>{r.name}</b></small></h6></Col>
                        </Tooltip>}
                        key={"unit-overlay-" + u.id}
                        delay={{ show: 500, hide: 100 }}
                        placement="auto"
                        popperConfig={{ modifiers: [preventOverflow] }}
                    >
                        <div onClick={property.onClick ? property.onClick : undefined}
                            className={classNames(
                                "unit-icon hover-weak-outline",
                                {
                                    "medium-outline hover-strong-outline": property.highlight.active
                                },
                                {
                                    "attacking-army-highlight": property.highlight.color == "red"
                                },
                                {
                                    "unit-highlight-yellow": property.highlight.color == "yellow"
                                },
                                {
                                    "unit-highlight-green": property.highlight.color == "green"
                                }
                            )}
                            style={{
                                backgroundImage: `url(${unitImages.get(u.allegiance.id).get(u.upgradedType ? u.upgradedType.id : u.type.id)})`,
                                opacity: opacity,
                                transform: transform
                            }}
                        />
                    </OverlayTrigger>
                })}
                {garrisons.has(r.id) && (
                    <OverlayTrigger
                        overlay={<Tooltip id={"garrison-tooltip-" + r.id}>
                            <Col className="text-center">
                                <h6>{garrisonControllers.get(r.id) == null
                                        ? <>Neutral Force token</>
                                        : <>Garrison<small> of <b>{garrisonControllers.get(r.id)?.name ?? "Unknown"}</b></small></>}
                                    <br /><small><b>{r.name}</b></small>
                                </h6>
                            </Col>
                        </Tooltip>}
                        key={"garrison-overlay-" + r.id}
                        delay={{ show: 500, hide: 100 }}
                        placement="auto"
                        popperConfig={{ modifiers: [preventOverflow] }}
                    >
                        <div
                            className="garrison-icon hover-weak-outline"
                            style={{
                                backgroundImage: `url(${garrisons.get(r.id)})`,
                                left: r.unitSlot.point.x, top: r.unitSlot.point.y
                            }}
                        >
                        </div>
                    </OverlayTrigger>
                )}
                {r.loyaltyTokens > 0 && (
                    <OverlayTrigger
                        overlay={<Tooltip id={"loyalty-tooltip-" + r.id}>
                            <Col className="text-center"><h6>Loyalty token<br /><small><b>{r.name}</b></small></h6></Col>
                        </Tooltip>}
                        key={"loyalty-overlay-" + r.id}
                        delay={{ show: 500, hide: 100 }}
                        placement="auto"
                        popperConfig={{ modifiers: [preventOverflow] }}
                    >
                        <div
                            className="loyalty-icon hover-weak-outline"
                            style={{
                                left: r.unitSlot.point.x,
                                top: r.unitSlot.point.y,
                                backgroundImage: `url(${loyaltyTokenImage})`,
                                textAlign: "center",
                                fontWeight: "bold",
                                fontFamily: "serif",
                                fontSize: "1.5rem",
                                color: "white"
                            }}
                        >{r.loyaltyTokens > 1 ? r.loyaltyTokens : ""}
                        </div>
                    </OverlayTrigger>
                )}
            </div>
        });
    }

    renderImprovements(region: Region): ReactNode {
        return <div id={`improvement-${region.id}`}
            className="units-container"
            style={{ left: region.improvementSlot.point.x, top: region.improvementSlot.point.y, width: region.improvementSlot.width, flexWrap: "wrap" }}
        >
            {_.range(0, region.barrelModifier).map((_, i) => {
                return <OverlayTrigger
                    key={`barrel-${region.id}-${i}`}
                    overlay={renderRegionTooltip(region)}
                    delay={{ show: 750, hide: 100 }}
                    placement="auto"
                    popperConfig={{ modifiers: [preventOverflow] }}
                >
                    <div key={`barrel-${region.id}-${i}`}
                        className="unit-icon medium"
                        style={{
                            backgroundImage: `url(${barrelImage})`,
                        }}
                    />
                </OverlayTrigger>
            })}
            {_.range(0, region.crownModifier).map((_, i) => {
                return <OverlayTrigger
                    key={`crown-${region.id}-${i}`}
                    overlay={renderRegionTooltip(region)}
                    delay={{ show: 750, hide: 100 }}
                    placement="auto"
                    popperConfig={{ modifiers: [preventOverflow] }}
                >
                    <div key={`crown-${region.id}-${i}`}
                        className="unit-icon medium"
                        style={{
                            backgroundImage: `url(${crownImage})`,
                        }}
                    />
                </OverlayTrigger>
            })}
        </div>
    }

    renderOrders(): ReactNode {
        const propertiesForOrders = this.getModifiedPropertiesForEntities<Region, OrderOnMapProperties>(
            _.flatMap(this.props.ingameGameState.world.regions.values),
            this.props.mapControls.modifyOrdersOnMap,
            { highlight: { active: false, color: "white" }, onClick: null, wrap: null }
        );

        return propertiesForOrders.map((region, properties) => {

            if (this.props.ingameGameState.childGameState instanceof PlanningGameState && this.props.ingameGameState.childGameState.childGameState instanceof PlaceOrdersGameState) {
                const planningGameState = this.props.ingameGameState.childGameState.childGameState;
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
        let planningOrAction = (this.ingame.childGameState instanceof PlanningGameState || this.ingame.childGameState instanceof ActionGameState) ? this.ingame.childGameState : null;

        if (planningOrAction instanceof ActionGameState && !(planningOrAction.childGameState instanceof UseRavenGameState)) {
            // Do not show restricted orders after Raven state because Doran may cause a restricted order to be shown which still can be executed
            planningOrAction = null;
        }

        const drawBorder = order?.type.restrictedTo == sea.kind;
        const controller = drawBorder ? region.getController() : null;
        const color = drawBorder && controller
            ? controller.id != "greyjoy"
                ? controller.color
                : "black"
            : undefined;

        const wrap = properties.wrap;

        return (
            <ConditionalWrap condition={true}
                    key={region.id}
                    wrap={wrap ? wrap : child =>
                        <OverlayTrigger overlay={this.renderOrderTooltip(order, region)}
                            delay={{ show: 500, hide: 100 }}
                            placement="auto"
                            popperConfig={{ modifiers: [preventOverflow] }}
                        >
                            {child}
                        </OverlayTrigger>
                    }
                >
                    <div className={classNames(
                        "order-container",
                        {
                            "hover-weak-outline": order != null,
                            "medium-outline hover-strong-outline clickable": order && properties.highlight.active,
                            "restricted-order": planningOrAction && order && this.ingame.game.isOrderRestricted(region, order, planningOrAction.planningRestrictions)
                        }
                    )}
                        style={{ left: region.orderSlot.x, top: region.orderSlot.y}}
                        onClick={properties.onClick ? properties.onClick : undefined}
                        key={"region-" + region.id}
                    >
                        <div className={classNames("order-icon", { "order-border": drawBorder } )}
                            style={{ backgroundImage: `url(${backgroundUrl})`, borderColor: color }} />
                    </div>
                </ConditionalWrap>
        );
    }

    private renderOrderTooltip(order: Order | null, region: Region): OverlayChildren {
        return <Tooltip id={"order-info"} className="tooltip-w-100">
            <Col className="text-center">
                <h6>{order ? order.type.name : "Order token"}<small> of <b>{region.getController()?.name ?? "Unknown"}<br />{region.name}</b></small></h6>
            </Col>
        </Tooltip>;
    }

    getRegionPath(region: Region): string {
        const points = this.props.ingameGameState.world.getContinuousBorder(region);

        return points.map(p => p.x + "," + p.y).join(" ");
    }
}
